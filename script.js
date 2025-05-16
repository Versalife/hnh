// script.js - FULL UPDATED VERSION

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
            event.preventDefault(); // Important: prevent default link behavior

            napkinsSidebar.classList.toggle('active'); // This toggles the sidebar's visibility

            // If the main mobile menu is also open, close it for better UX
            if (menuIcon && menuItemsContainer && menuItemsContainer.classList.contains('active')) {
                menuIcon.classList.remove('active');
                menuItemsContainer.classList.remove('active');
            }
            // Optional: if you add an overlay class to the body when sidebar is open
            // document.body.classList.toggle('napkins-sidebar-is-active');
        });
    } else {
        // Debugging messages if elements aren't found
        if (!toggleNapkinsLinkMobile) {
            console.warn("Mobile 'Napkins' toggle link with ID 'toggle-napkins-sidebar-mobile' was not found in the HTML. Ensure the ID is correct.");
        }
        if (!napkinsSidebar) {
            console.warn("Napkins sidebar with class '.sidebar-left' was not found in the HTML.");
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
    const menuIcon = document.querySelector('.menu .menu-icon');
    const menuItemsContainer = document.querySelector('.menu .menu-list-mobile');
    if (menuIcon && menuItemsContainer && menuItemsContainer.classList.contains('active')) {
        menuIcon.classList.remove('active');
        menuItemsContainer.classList.remove('active');
    }

    // 2. Close Napkins sidebar if it's open
    const napkinsSidebar = document.querySelector('.sidebar-left');
    if (napkinsSidebar && napkinsSidebar.classList.contains('active')) {
        napkinsSidebar.classList.remove('active');
        // Optional: document.body.classList.remove('napkins-sidebar-is-active');
    }

    // 3. Perform navigation (update hash)
    if (dest_html.startsWith('#')) {
        dest_html = dest_html.substring(1);
    }
    window.location.hash = dest_html;
}

function loadContentFromHash() {
    const contentArea = document.querySelector(".content .post"); // This is your <object> or <iframe>
    if (!contentArea) {
        console.error("Content area '.content .post' not found.");
        return;
    }

    let currentUrlHash = window.location.hash.substring(1); // Get path from URL hash, removing '#'
    let targetPath = currentUrlHash;

    if (!targetPath) { // No hash in the URL (e.g., initial load)
        let defaultPathFromHtml = '';
        // Check for src (iframe) or data (object). Your index.html uses <object>
        if (contentArea.hasAttribute('data')) { // Prioritize 'data' as per your index.html
            defaultPathFromHtml = contentArea.getAttribute('data');
        } else if (contentArea.hasAttribute('src')) {
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
    if (contentArea.hasAttribute('data')) { // As per your index.html
        currentContentPath = contentArea.getAttribute('data');
    } else if (contentArea.hasAttribute('src')) {
        currentContentPath = contentArea.getAttribute('src');
    }

    if (targetPath && currentContentPath !== targetPath) {
        if (contentArea.hasAttribute('data')) { // As per your index.html
            contentArea.setAttribute("data", targetPath);
        } else if (contentArea.hasAttribute('src')) { // If you ever switch to iframe
            contentArea.setAttribute("src", targetPath);
        }
    }
}

// Efficient includeHTML function
async function includeHTML() {
    let stillIncluding = true;
    const maxIterations = 100;
    let currentIteration = 0;

    while (stillIncluding && currentIteration < maxIterations) {
        currentIteration++;
        const elementsToInclude = Array.from(document.querySelectorAll("[w3-include-html]"));

        if (elementsToInclude.length === 0) {
            stillIncluding = false;
            continue;
        }

        await Promise.all(elementsToInclude.map(async (elmnt) => {
            const file = elmnt.getAttribute("w3-include-html");
            if (file) {
                try {
                    const response = await fetch(file);
                    if (response.ok) {
                        const html = await response.text();
                        elmnt.innerHTML = html;
                    } else {
                        elmnt.textContent = `Page not found: ${file}`;
                        console.error(`Failed to fetch ${file}: ${response.status} ${response.statusText}`);
                    }
                } catch (error) {
                    elmnt.textContent = `Error loading file: ${file}`;
                    console.error(`Error fetching the file ${file}:`, error);
                }
                elmnt.removeAttribute("w3-include-html");
            }
        }));
    }

    if (currentIteration >= maxIterations) {
        console.warn("includeHTML: Reached maximum iterations.");
    }
}

async function mainIncludeHTML() {
    await includeHTML();
}