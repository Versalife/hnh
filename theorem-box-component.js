class TheoremBox extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this._renderInitialStructure();
    }

    static get observedAttributes() {
        // Added 'type' to observed attributes
        return ['type', 'title', 'given', 'where', 'then', 'notes', 'proof'];
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue !== newValue) {
            this._populateContent();
        }
    }

    connectedCallback() {
        this._populateContent();
    }

    _renderInitialStructure() {
        const katexCssUrl = "https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css";
        const katexCssIntegrity = "sha384-GvrOXuhMATgEsSwCs4smul74iXGOixntILdUW9XmUC6+HX0sLNAK3q71HotJqlAn";

        const componentStyles = `
            /* Styles for the theorem-box component itself */
            .theorem-box {
                border: 2px solid #ccc;
                background-color: #fffff8;
                box-shadow: 0 0 5px rgba(0, 0, 0, 0.1);
                width: 58%;
                display: flex;
                flex-direction: column;
                margin-bottom: 1em;
            }

            h2 {
    font-style: italic;
    font-weight: 400;
    margin-top: 1.9rem;
    margin-bottom: 1.3rem;
    font-size: 2.1rem;
    line-height: 1;
}

h3 {
    font-style: italic;
    font-weight: 400;
    font-size: 1.6rem;
    margin-top: 1.9rem;
    margin-bottom: 1.3rem;
    }

            .theorem-box h1, .theorem-box h2 {
                margin-top: 0;
                margin-bottom: 0;
                padding: 2px 0;
            }

            .theorem-box .theorem-box-title {
                flex-shrink: 0;
                text-align: left;
                border-bottom: 1px solid #111;
                background-color: antiquewhite; /* Default for 'theorem' type */
            }

            /* Style for 'definition' type header */
            .theorem-box.type-definition .theorem-box-title {
                background-color: #e6f7ff; /* Example: Light blue for definitions */
            }

            .theorem-box .theorem-title {
                font-weight: bold;
                font-size: 1.5rem;
            }

            .theorem-box .theorem-box-content {
                flex-grow: 1;
                line-height: 1.32;
                // padding: 10px 2% 5px 2%;
            }

            .theorem-box .section {
                margin-bottom: 0.75em;
            }
            .theorem-box .section:last-child {
                margin-bottom: 0;
            }

            .theorem-box .section-title {
                font-size: 1.4rem;
                // margin-bottom: 0.3em;
            }

            .theorem-box .numbered-list {
                list-style-type: decimal;
                font-size: 1.3rem;
                margin-top: 0;
                padding-left: 25px;
            }
            .theorem-box .numbered-list > li {
                margin-bottom: 0.2em;
            }

            /* --- Media Query for Mobile Responsiveness --- */
        @media (max-width: 768px) {
            .theorem-box {
                width: 100%;
            }
        `;

        const htmlStructure = `
            <div class="theorem-box">
                <div class="theorem-box-title">
                    <h1 class="theorem-title"></h1>
                </div>
                <div class="theorem-box-content">
                    </div>
            </div>
        `;

        this.shadowRoot.innerHTML = `
            <link rel="stylesheet" href="${katexCssUrl}" integrity="${katexCssIntegrity}" crossorigin="anonymous">
            <style>
                ${componentStyles}
            </style>
            ${htmlStructure}
        `;
    }

    _populateContent() {
        const theoremBoxElement = this.shadowRoot.querySelector('.theorem-box');
        const titleElement = this.shadowRoot.querySelector('.theorem-title');
        const contentContainer = this.shadowRoot.querySelector('.theorem-box-content');

        if (!theoremBoxElement || !titleElement || !contentContainer) {
            // console.error("TheoremBox: Shadow DOM core elements not found for content population.");
            return;
        }

        // Determine the type and set prefix & class
        const typeAttr = (this.getAttribute('type') || 'theorem').toLowerCase();
        let titlePrefix = "Theorem";

        // Remove any pre-existing type classes to handle changes correctly
        theoremBoxElement.classList.remove('type-theorem', 'type-definition');

        if (typeAttr === 'definition') {
            titlePrefix = "Definition";
            theoremBoxElement.classList.add('type-definition');
        } else { // Default to 'theorem' for unknown types or if type="theorem"
            titlePrefix = "Theorem";
            theoremBoxElement.classList.add('type-theorem'); // Add for clarity and future theorem-specific styles
        }

        // Set the main theorem title with the determined prefix
        const titleValue = this.getAttribute('title') || ""; // Use actual title, or empty string if not provided
        titleElement.textContent = `${titlePrefix}: ${titleValue}`;

        // Clear previous section content
        contentContainer.innerHTML = '';

        const sectionsData = [
            { title: "Given", attrName: "given" },
            { title: "Where", attrName: "where" },
            { title: "Then", attrName: "then" },
            { title: "Notes", attrName: "notes" },
            { title: "Proof", attrName: "proof" }
        ];

        let contentWasAdded = false;
        sectionsData.forEach(sectionInfo => {
            const attributeValue = this.getAttribute(sectionInfo.attrName);
            if (attributeValue && attributeValue.trim() !== "") {
                const sectionDiv = document.createElement('div');
                sectionDiv.className = 'section';

                const sectionTitleElement = document.createElement('h2');
                sectionTitleElement.className = 'section-title';
                sectionTitleElement.textContent = sectionInfo.title + ":";

                const listElement = document.createElement('ul');
                listElement.className = 'numbered-list';
                listElement.innerHTML = attributeValue;

                sectionDiv.appendChild(sectionTitleElement);
                sectionDiv.appendChild(listElement);
                contentContainer.appendChild(sectionDiv);
                contentWasAdded = true;
            }
        });

        if (contentWasAdded) {
            if (typeof window.katex !== 'undefined' && typeof window.renderMathInElement === 'function') {
                try {
                    window.renderMathInElement(contentContainer, {
                        delimiters: [
                            { left: "$$", right: "$$", display: true },
                            { left: "$", right: "$", display: false },
                            { left: "\\(", right: "\\)", display: false },
                            { left: "\\[", right: "\\]", display: true }
                        ],
                        throwOnError: false
                    });
                } catch (error) {
                    console.error('TheoremBox: Error during KaTeX rendering:', error);
                }
            } else if (typeof window.katex === 'undefined' || typeof window.renderMathInElement !== 'function') {
                console.warn('TheoremBox: KaTeX core (window.katex) or global renderMathInElement not found. Math rendering in component will not occur.');
            }
        }
    }
}

customElements.define('theorem-box', TheoremBox);