// script.js - FULL VERSION with latest fixes & swipe-to-close sidebar

document.addEventListener('DOMContentLoaded', function () {
    // --- Element Selections ---
    const menuIcon = document.querySelector('.menu .menu-icon');
    const menuItemsContainer = document.querySelector('.menu .menu-list-mobile');
    const toggleNapkinsLinkMobile = document.getElementById('toggle-napkins-sidebar-mobile');
    const napkinsSidebar = document.querySelector('.sidebar-left');

    // --- Mobile Menu (Hamburger) Functionality ---
    if (menuIcon && menuItemsContainer) {
        menuIcon.addEventListener('click', function () {
            menuIcon.classList.toggle('active');
            menuItemsContainer.classList.toggle('active');
        });
    }

    // --- Helper function to CLOSE the Napkins sidebar ---
    function closeNapkinsSidebar() {
        if (napkinsSidebar && napkinsSidebar.classList.contains('active')) {
            napkinsSidebar.classList.remove('active');
            document.body.classList.remove('sidebar-is-open');
        }
    }

    // --- Napkins Sidebar Toggle Functionality (for Mobile click) ---
    if (toggleNapkinsLinkMobile && napkinsSidebar) {
        toggleNapkinsLinkMobile.addEventListener('click', function (event) {
            event.preventDefault(); // Important: prevent anchor default action

            // Toggle the sidebar's active state
            const isSidebarNowOpening = !napkinsSidebar.classList.contains('active');
            napkinsSidebar.classList.toggle('active');
            document.body.classList.toggle('sidebar-is-open', isSidebarNowOpening);

            // If the sidebar is opening AND the main mobile menu is also open, close the main menu for better UX
            if (isSidebarNowOpening && menuIcon && menuItemsContainer && menuItemsContainer.classList.contains('active')) {
                menuIcon.classList.remove('active');
                menuItemsContainer.classList.remove('active');
            }
        });
    }

    // --- Swipe Left to Close Napkins Sidebar Functionality ---
    if (napkinsSidebar) {
        let touchStartX = 0;
        let touchStartY = 0;
        const swipeThreshold = 50;         // Minimum horizontal distance (pixels) to be considered a swipe
        const swipeMaxVerticalRatio = 0.75; // Allow vertical movement up to 75% of horizontal (e.g. for slightly diagonal swipes)

        napkinsSidebar.addEventListener('touchstart', function (event) {
            // Only start tracking if the sidebar is currently active (visible)
            if (napkinsSidebar.classList.contains('active')) {
                touchStartX = event.changedTouches[0].clientX;
                touchStartY = event.changedTouches[0].clientY;
            }
        }, { passive: true }); // Use passive for better scroll performance if not preventing default

        napkinsSidebar.addEventListener('touchend', function (event) {
            // Ensure a touchstart occurred on an active sidebar
            if (!napkinsSidebar.classList.contains('active') || touchStartX === 0) {
                touchStartX = 0; // Reset
                touchStartY = 0; // Reset
                return;
            }

            let touchEndX = event.changedTouches[0].clientX;
            let touchEndY = event.changedTouches[0].clientY;

            let deltaX = touchEndX - touchStartX;
            let deltaY = touchEndY - touchStartY;

            // Check for a swipe left:
            // 1. Horizontal movement (deltaX) is negative (left) and exceeds threshold.
            // 2. Vertical movement (abs(deltaY)) is less than horizontal movement (abs(deltaX)) multiplied by the ratio.
            //    This helps differentiate a horizontal swipe from a vertical scroll inside the sidebar.
            if (deltaX < -swipeThreshold && (Math.abs(deltaY) < Math.abs(deltaX) * swipeMaxVerticalRatio)) {
                closeNapkinsSidebar(); // Use the helper function
            }

            // Reset start coordinates for the next touch operation
            touchStartX = 0;
            touchStartY = 0;
        });
    }

    // --- Hash-based Navigation Setup ---
    loadContentFromHash(); // Load content based on initial hash (or default)
    window.addEventListener('hashchange', loadContentFromHash); // Listen for back/forward/navigate

    // --- Initialize includeHTML functionality ---
    mainIncludeHTML().catch((error) => console.error("Error in main function for includeHTML:", error));
}); // End of DOMContentLoaded

// --- navigate function ---
// This function already handles closing the sidebar when a navigation link is clicked.
// The new closeNapkinsSidebar() function is consistent with this logic.
function navigate(dest_html) {
    // 1. Close main mobile menu if it's open
    const menuIcon = document.querySelector('.menu .menu-icon');
    const menuItemsContainer = document.querySelector('.menu .menu-list-mobile');
    if (menuIcon && menuItemsContainer && menuItemsContainer.classList.contains('active')) {
        menuIcon.classList.remove('active');
        menuItemsContainer.classList.remove('active');
    }

    // 2. Close Napkins sidebar if it's open and remove body scroll lock
    // This uses the same logic as the new closeNapkinsSidebar helper.
    const napkinsSidebar = document.querySelector('.sidebar-left');
    if (napkinsSidebar && napkinsSidebar.classList.contains('active')) {
        napkinsSidebar.classList.remove('active');
        document.body.classList.remove('sidebar-is-open');
    }

    // 3. Perform navigation (update hash)
    if (dest_html.startsWith('#')) {
        dest_html = dest_html.substring(1);
    }
    window.location.hash = dest_html;
}

// --- loadContentFromHash function ---
function loadContentFromHash() {
    const contentArea = document.querySelector(".content .post");
    if (!contentArea) {
        console.error("Content area '.content .post' not found.");
        return;
    }

    let currentUrlHash = window.location.hash.substring(1);
    let targetPath = currentUrlHash;

    if (!targetPath) {
        let defaultPathFromHtml = '';
        if (contentArea.hasAttribute('data')) {
            defaultPathFromHtml = contentArea.getAttribute('data');
        } else if (contentArea.hasAttribute('src')) {
            defaultPathFromHtml = contentArea.getAttribute('src');
        }

        if (defaultPathFromHtml) {
            targetPath = defaultPathFromHtml;
            history.replaceState(null, null, '#' + targetPath);
        } else {
            console.warn("No hash in URL and no default 'data' or 'src' attribute found on '.content .post'. Cannot determine content to load.");
            return;
        }
    }

    let currentContentPath = '';
    if (contentArea.hasAttribute('data')) {
        currentContentPath = contentArea.getAttribute('data');
    } else if (contentArea.hasAttribute('src')) {
        currentContentPath = contentArea.getAttribute('src');
    }

    if (targetPath && currentContentPath !== targetPath) {
        if (contentArea.hasAttribute('data')) {
            contentArea.setAttribute("data", targetPath);
        } else if (contentArea.hasAttribute('src')) {
            contentArea.setAttribute("src", targetPath);
        }
    }
}

// --- includeHTML function ---
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
        console.warn("includeHTML: Reached maximum iterations. This could indicate an infinite loop or very deep nesting of includes.");
    }
}

// Async wrapper function to call includeHTML.
async function mainIncludeHTML() {
    await includeHTML();
}