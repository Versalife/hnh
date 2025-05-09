// script.js

document.addEventListener('DOMContentLoaded', function () {
    // Handles mobile menu toggle
    var menuIcon = document.querySelector('.menu .menu-icon');
    var menuItems = document.querySelector('.menu .menu-list-mobile');

    if (menuIcon && menuItems) { // Ensure elements exist
        menuIcon.addEventListener('click', function () {
            menuIcon.classList.toggle('active');
            menuItems.classList.toggle('active');
        });
    }

    // Load initial content based on hash, or set hash based on default content
    loadContentFromHash();

    // Listen for hash changes (e.g., back/forward buttons, programmatic navigation)
    window.addEventListener('hashchange', loadContentFromHash);

    // Initialize the more efficient includeHTML functionality
    mainIncludeHTML().catch((error) => console.error("Error in main function for includeHTML:", error));
});

function loadContentFromHash() {
    var contentArea = document.querySelector(".content .post");
    if (!contentArea) {
        console.error("Content area '.content .post' not found.");
        return;
    }

    let currentUrlHash = window.location.hash.substring(1); // Get path from URL hash, removing '#'
    let targetPath = currentUrlHash; // This is the path we intend to load

    if (!targetPath) {
        // No hash in the URL (e.g., initial load of domain.com/)
        // Use the default path specified in the <object>'s data attribute in index.html
        const defaultPathFromHtml = contentArea.getAttribute('data');
        if (defaultPathFromHtml) {
            targetPath = defaultPathFromHtml;
            // Update the URL hash to reflect the default content being shown.
            // history.replaceState ensures this doesn't add a new entry to the browser history.
            history.replaceState(null, null, '#' + targetPath);
        } else {
            console.warn("No hash in URL and no default 'data' attribute found on '.content .post'. Cannot determine content to load.");
            return;
        }
    }

    // Only update the <object>'s data attribute if the targetPath is different
    // from what it's currently displaying. This prevents unnecessary reloads/flickering.
    if (contentArea.getAttribute('data') !== targetPath) {
        contentArea.setAttribute("data", targetPath);
    }
}

function navigate(dest_html) {
    // Clean potential leading '#' from dest_html, as we add it consistently.
    if (dest_html.startsWith('#')) {
        dest_html = dest_html.substring(1);
    }
    // Setting the hash will trigger the 'hashchange' event,
    // which in turn calls loadContentFromHash to update the content.
    window.location.hash = dest_html;
}

/**
 * More efficient and robust includeHTML function.
 * Iteratively finds elements with the 'w3-include-html' attribute,
 * fetches the specified HTML file, and injects its content.
 * Handles nested includes by re-scanning after each pass.
 * Fetches are done in parallel per pass for improved performance.
 */
async function includeHTML() {
    let stillIncluding = true;
    // Safeguard against potential infinite loops or excessively deep nesting.
    const maxIterations = 100;
    let currentIteration = 0;

    while (stillIncluding && currentIteration < maxIterations) {
        currentIteration++;
        const elementsToInclude = Array.from(document.querySelectorAll("[w3-include-html]"));

        if (elementsToInclude.length === 0) {
            stillIncluding = false; // No more elements with the attribute, so we're done.
            continue;
        }

        // Process all currently found elements in parallel for this pass.
        await Promise.all(elementsToInclude.map(async (elmnt) => {
            const file = elmnt.getAttribute("w3-include-html");
            if (file) {
                try {
                    const response = await fetch(file);
                    if (response.ok) {
                        const html = await response.text();
                        elmnt.innerHTML = html; // Injects the fetched HTML content.
                    } else {
                        // Display error message within the element.
                        elmnt.textContent = `Page not found: ${file}`;
                        console.error(`Failed to fetch ${file}: ${response.status} ${response.statusText}`);
                    }
                } catch (error) {
                    elmnt.textContent = `Error loading file: ${file}`;
                    console.error(`Error fetching the file ${file}:`, error);
                }
                // Remove the attribute after processing to prevent reprocessing this specific instance
                // and to ensure the loop terminates correctly when no new includes are found.
                elmnt.removeAttribute("w3-include-html");
            }
        }));
        // After this pass, the loop will re-query `document.querySelectorAll`
        // to find any new `w3-include-html` attributes that might have been
        // introduced by the content loaded in this pass (handling nested includes).
    }

    if (currentIteration >= maxIterations) {
        console.warn("includeHTML: Reached maximum iterations. This could indicate an infinite loop (e.g., files including each other) or very deep nesting of includes.");
    }
}

// Async wrapper function to call includeHTML.
async function mainIncludeHTML() {
    await includeHTML();
}

// The call to mainIncludeHTML() is made within the DOMContentLoaded listener.