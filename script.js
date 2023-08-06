document.addEventListener('DOMContentLoaded', function () {
    var menuIcon = document.querySelector('.menu .menu-icon');
    var menuItems = document.querySelector('.menu .menu-list-mobile');

    menuIcon.addEventListener('click', function () {
        menuIcon.classList.toggle('active');
        menuItems.classList.toggle('active');
    });
});

function navigate(dest_html) {
    var contentArea = document.querySelector(".content .post");
    contentArea.setAttribute("data", dest_html);
}

async function includeHTML() {
    const elements = document.querySelectorAll("[w3-include-html]");
    for (const elmnt of elements) {
        const file = elmnt.getAttribute("w3-include-html");
        if (file) {
            try {
                const response = await fetch(file);
                if (response.ok) {
                    const html = await response.text();
                    elmnt.innerHTML = html;
                } else {
                    elmnt.innerHTML = "Page not found.";
                }
            } catch (error) {
                console.error("Error fetching the file:", error);
            }
            elmnt.removeAttribute("w3-include-html");
            await includeHTML();
        }
    }
}

// Call includeHTML inside an async function
async function main() {
    await includeHTML();
}

// Call the main function to start the process
main().catch((error) => console.error("Error in main function:", error));
