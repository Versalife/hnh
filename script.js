// script.js - FULL VERSION with latest fixes

document.addEventListener('DOMContentLoaded', function () {
    // --- Mobile Menu (Hamburger) Functionality ---
    const menuIcon = document.querySelector('.menu .menu-icon');
    const menuItemsContainer = document.querySelector('.menu .menu-list-mobile');

    if (menuIcon && menuItemsContainer) {
        menuIcon.addEventListener('click', function () {
            menuIcon.classList.toggle('active');
            menuItemsContainer.classList.toggle('active');
        });
    }

    // --- Napkins Sidebar Toggle Functionality (for Mobile) ---
    const toggleNapkinsLinkMobile = document.getElementById('toggle-napkins-sidebar-mobile');
    const napkinsSidebar = document.querySelector('.sidebar-left');

    if (toggleNapkinsLinkMobile && napkinsSidebar) {
        toggleNapkinsLinkMobile.addEventListener('click', function(event) {
            event.preventDefault(); // Important: prevent anchor default action

            // Toggle the sidebar's active state and get its new state (true if open, false if closed)
            const isSidebarOpen = napkinsSidebar.classList.toggle('active');

            // Toggle a class on the body to prevent/allow page scrolling
            document.body.classList.toggle('sidebar-is-open', isSidebarOpen);

            // If the main mobile menu is also open, close it for better UX
            if (menuIcon && menuItemsContainer && menuItemsContainer.classList.contains('active')) {
                menuIcon.classList.remove('active');
                menuItemsContainer.classList.remove('active');
            }
        });
    } else {
        // Debugging messages if elements aren't found:
        if (!toggleNapkinsLinkMobile) {
            console.warn("Mobile 'Napkins' toggle link with ID 'toggle-napkins-sidebar-mobile' not found in the HTML. Ensure the ID is correct.");
        }
        if (!napkinsSidebar) {
            console.warn("Napkins sidebar with class '.sidebar-left' not found in the HTML.");
        }
    }

    // --- Hash-based Navigation Setup ---
    loadContentFromHash(); // Load content based on initial hash (or default)
    window.addEventListener('hashchange', loadContentFromHash); // Listen for back/forward/navigate

    // --- Initialize includeHTML functionality ---
    mainIncludeHTML().catch((error) => console.error("Error in main function for includeHTML:", error));
});

function navigate(dest_html) {
    // 1. Close main mobile menu if it's open
    const menuIcon = document.querySelector('.menu .menu-icon'); // Re-query in function scope
    const menuItemsContainer = document.querySelector('.menu .menu-list-mobile'); // Re-query
    if (menuIcon && menuItemsContainer && menuItemsContainer.classList.contains('active')) {
        menuIcon.classList.remove('active');
        menuItemsContainer.classList.remove('active');
    }

    // 2. Close Napkins sidebar if it's open and remove body scroll lock
    const napkinsSidebar = document.querySelector('.sidebar-left'); // Re-query
    if (napkinsSidebar && napkinsSidebar.classList.contains('active')) {
        napkinsSidebar.classList.remove('active');
        document.body.classList.remove('sidebar-is-open'); // Remove class from body
    }

    // 3. Perform navigation (update hash)
    if (dest_html.startsWith('#')) {
        dest_html = dest_html.substring(1);
    }
    window.location.hash = dest_html;
}

function loadContentFromHash() {
    // Ensure you are targeting your content loading area, whether <object> or <iframe>
    const contentArea = document.querySelector(".content .post");
    if (!contentArea) {
        console.error("Content area '.content .post' not found.");
        return;
    }

    let currentUrlHash = window.location.hash.substring(1); // Get path from URL hash, removing '#'
    let targetPath = currentUrlHash;

    if (!targetPath) { // No hash in the URL (e.g., initial load)
        let defaultPathFromHtml = '';
        // Check for data (object - as in your original index.html) or src (iframe)
        if (contentArea.hasAttribute('data')) {
            defaultPathFromHtml = contentArea.getAttribute('data');
        } else if (contentArea.hasAttribute('src')) { // In case you switched to iframe
            defaultPathFromHtml = contentArea.getAttribute('src');
        }

        if (defaultPathFromHtml) {
            targetPath = defaultPathFromHtml;
            // Update the URL hash to reflect the default content, without adding to history.
            history.replaceState(null, null, '#' + targetPath);
        } else {
            console.warn("No hash in URL and no default 'data' or 'src' attribute found on '.content .post'. Cannot determine content to load.");
            return; // Can't proceed if no target determined
        }
    }

    // Update the <object data> or <iframe src> attribute if it's different
    let currentContentPath = '';
    if (contentArea.hasAttribute('data')) { // As per your original index.html
        currentContentPath = contentArea.getAttribute('data');
    } else if (contentArea.hasAttribute('src')) { // In case you switched to iframe
        currentContentPath = contentArea.getAttribute('src');
    }


    if (targetPath && currentContentPath !== targetPath) {
        if (contentArea.hasAttribute('data')) { // As per your original index.html
            contentArea.setAttribute("data", targetPath);
        } else if (contentArea.hasAttribute('src')) { // If you ever switch to iframe
            contentArea.setAttribute("src", targetPath);
        }
    }
}

// Efficient includeHTML function
async function includeHTML() {
    let stillIncluding = true;
    const maxIterations = 100; // Safeguard against infinite loops
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
                // Remove the attribute after processing
                elmnt.removeAttribute("w3-include-html");
            }
        }));
    }

    if (currentIteration >= maxIterations) {
        console.warn("includeHTML: Reached maximum iterations. This could indicate an infinite loop or very deep nesting of includes.");
    }
}

// Async wrapper function to call includeHTML.
async function mainIncludeHTML() {
    await includeHTML();
}