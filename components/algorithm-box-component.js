class AlgorithmBox extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this._renderInitialStructure();
    }

    static get observedAttributes() {
        return ['title', 'inputs', 'where', 'outputs', 'procedure', 'notes'];
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue !== newValue) {
            this._populateContent();
        }
    }

    connectedCallback() {
        this._populateContent();
        this._setupEventListeners(); // Initial setup for already rendered content
    }

    _renderInitialStructure() {
        const katexCssUrl = "https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css"; // Match your KaTeX version
        const katexCssIntegrity = "sha384-GvrOXuhMATgEsSwCs4smul74iXGOixntILdUW9XmUC6+HX0sLNAK3q71HotJqlAn";

        const componentStyles = `
            :host { /* Style the component host itself */
                display: block; /* Make it a block-level element */
                margin-bottom: 1.5em; /* Space below the component */
            }
            .algo-box-container {
                border: 1px solid #b0b0b0;
                background-color: #fdfdfd;
                box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                border-radius: 4px;
                width: 58%;
                display: flex;
                flex-direction: column;
                margin-bottom: 1em;
            }

            .algo-box-main-title {
                font-size: 1.6rem;
                font-weight: bold;
                color: #333;
                padding: 12px 15px;
                margin: 0;
                border-bottom: 1px solid #e0e0e0;
                background-color: #f5f5f5;
                border-top-left-radius: 4px;
                border-top-right-radius: 4px;
            }

            .algo-section {
                margin-bottom: 0px; /* Sections are packed */
                border-bottom: 1px solid #eee;
            }
            .algo-section:last-child {
                border-bottom: none;
            }

            .algo-section-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 10px 15px;
                cursor: pointer;
                background-color: #fafafa;
                transition: background-color 0.2s ease;
            }
            .algo-section-header:hover {
                background-color: #f0f0f0;
            }

            .algo-section-title {
                font-size: 1.3rem;
                font-weight: 600;
                margin: 0;
                color: #444;
            }

            .algo-section-toggle-icon {
                font-size: 1.2rem;
                transition: transform 0.3s ease-out;
                user-select: none; /* Prevent text selection of arrow */
            }
            .algo-section-toggle-icon.expanded {
                transform: rotate(90deg);
            }

            .algo-section-content {
                padding: 0px 15px 10px 15px;
                background-color: #fff;
                /* Animation for collapse/expand */
                max-height: 2000px; /* Set a sufficiently large max-height for content */
                overflow: hidden;
                transition: max-height 0.4s ease-in-out, padding 0.4s ease-in-out, opacity 0.3s ease-in-out;
                opacity: 1;
            }
            .algo-section-content.collapsed {
                max-height: 0;
                padding-top: 0 !important;
                padding-bottom: 0 !important;
                opacity: 0;
                /* border-top: none; */ /* Could hide border when collapsed */
            }

            .algo-section-content ol, .algo-section-content ul {
                padding-left: 25px;
                margin-top: 5px;
                margin-bottom: 5px;
                font-size: 1.1rem;
                line-height: 1.6;
            }
            .algo-section-content li {
                margin-bottom: 0.4em;
            }

            .algo-note-tag {
                cursor: pointer;
                color: #007bff; /* Bootstrap primary blue */
                font-weight: bold;
                font-size: 0.9em;
                margin-left: 5px;
                text-decoration: none;
                border-bottom: 1px dotted #007bff;
            }
            .algo-note-tag:hover {
                color: #0056b3;
                border-bottom-style: solid;
            }

            .algo-note-content {
                display: none; /* Hidden by default */
                margin-left: 20px;
                margin-top: 5px;
                padding: 8px 12px;
                background-color: #f9f9f9;
                border: 1px solid #e0e0e0;
                border-left: 3px solid #007bff;
                border-radius: 3px;
                font-size: 0.95em;
                color: #333;
                line-height: 1.5;
            }
            .algo-note-content.visible {
                display: block;
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

            /* Mobile Responsiveness */
            @media (max-width: 768px) {
                .algo-box-container {
                    /* Uses host's block display and page margins */
                    width: 100%
                }
                .algo-box-main-title {
                    font-size: 1.4rem;
                    padding: 10px 12px;
                }
                .algo-section-header {
                    padding: 8px 12px;
                }
                .algo-section-title {
                    font-size: 1.15rem;
                }
                .algo-section-content {
                    padding: 0px 12px 8px 12px;
                }
                 .algo-section-content.collapsed {
                    padding-left: 12px !important;
                    padding-right: 12px !important;
                }
                .algo-section-content ol, .algo-section-content ul {
                    font-size: 1rem;
                    padding-left: 20px;
                }
            }
        `;

        const htmlStructure = `
            <div class="algo-box-container">
                <h1 class="algo-box-main-title"></h1>
                <div class="algo-sections-wrapper">
                    </div>
            </div>
        `;

        this.shadowRoot.innerHTML = `
            <link rel="stylesheet" href="${katexCssUrl}" integrity="${katexCssIntegrity}" crossorigin="anonymous">
            <style>${componentStyles}</style>
            ${htmlStructure}
        `;
    }

    _populateContent() {
        const mainTitleElement = this.shadowRoot.querySelector('.algo-box-main-title');
        const sectionsWrapper = this.shadowRoot.querySelector('.algo-sections-wrapper');

        if (!mainTitleElement || !sectionsWrapper) return;

        const titleAttr = this.getAttribute('title') || "Algorithm";
        mainTitleElement.textContent = titleAttr;

        sectionsWrapper.innerHTML = ''; // Clear previous sections

        const sectionsData = [
            { id: 'inputs', title: "Inputs", attrName: "inputs", listType: "ol" },
            { id: 'where', title: "Where", attrName: "where", listType: "ol" },
            { id: 'outputs', title: "Outputs", attrName: "outputs", listType: "ol" },
            { id: 'procedure', title: "Procedure", attrName: "procedure", listType: "ol" },
            { id: 'notes', title: "Notes", attrName: "notes", listType: "ul" }
        ];

        let contentWasAdded = false;
        sectionsData.forEach(sectionInfo => {
            const attributeValue = this.getAttribute(sectionInfo.attrName);
            if (attributeValue && attributeValue.trim() !== "") {
                contentWasAdded = true;
                const sectionElement = document.createElement('div');
                sectionElement.className = 'algo-section';
                sectionElement.id = `algo-section-${sectionInfo.id}`;

                const headerElement = document.createElement('div');
                headerElement.className = 'algo-section-header';
                headerElement.setAttribute('aria-expanded', 'true'); // Start expanded
                headerElement.setAttribute('aria-controls', `algo-content-${sectionInfo.id}`);


                const titleElement = document.createElement('h2');
                titleElement.className = 'algo-section-title';
                titleElement.textContent = sectionInfo.title;

                const toggleIcon = document.createElement('span');
                toggleIcon.className = 'algo-section-toggle-icon expanded';
                toggleIcon.innerHTML = '&#9654;'; // Right-pointing triangle, will rotate

                headerElement.appendChild(titleElement);
                headerElement.appendChild(toggleIcon);

                const contentElement = document.createElement('div');
                contentElement.className = 'algo-section-content';
                contentElement.id = `algo-content-${sectionInfo.id}`;

                const listElement = document.createElement(sectionInfo.listType);
                listElement.innerHTML = attributeValue; // User provides <li> items

                contentElement.appendChild(listElement);
                sectionElement.appendChild(headerElement);
                sectionElement.appendChild(contentElement);
                sectionsWrapper.appendChild(sectionElement);
            }
        });

        if (contentWasAdded) {
            this._attemptKaTeXRender(sectionsWrapper); // Render KaTeX on the whole wrapper
        }
        // Event listeners are setup once in connectedCallback and then re-setup if content changes significantly
        // or delegate from sectionsWrapper if preferred. For now, _setupEventListeners will handle it.
    }

    _setupEventListeners() {
        const sectionsWrapper = this.shadowRoot.querySelector('.algo-sections-wrapper');
        if (!sectionsWrapper) return;

        // Event delegation for collapsible sections and inline notes
        sectionsWrapper.addEventListener('click', (event) => {
            // Handle collapsible section headers
            const sectionHeader = event.target.closest('.algo-section-header');
            if (sectionHeader) {
                const contentElement = sectionHeader.nextElementSibling; // Should be .algo-section-content
                const toggleIcon = sectionHeader.querySelector('.algo-section-toggle-icon');
                if (contentElement && contentElement.classList.contains('algo-section-content')) {
                    const isExpanded = contentElement.classList.toggle('collapsed');
                    toggleIcon.classList.toggle('expanded', !isExpanded);
                    sectionHeader.setAttribute('aria-expanded', !isExpanded);
                }
                return; // Prevent further processing if header click
            }

            // Handle inline note tags
            const noteTag = event.target.closest('.algo-note-tag');
            if (noteTag) {
                const noteContent = noteTag.nextElementSibling; // Should be .algo-note-content
                if (noteContent && noteContent.classList.contains('algo-note-content')) {
                    noteContent.classList.toggle('visible');
                }
            }
        });
    }


    _attemptKaTeXRender(container, retries = 5, delay = 200) {
        if (typeof window.katex !== 'undefined' && typeof window.renderMathInElement === 'function') {
            try {
                window.renderMathInElement(container, {
                    delimiters: [
                        { left: "$$", right: "$$", display: true },
                        { left: "$", right: "$", display: false },
                        { left: "\\(", right: "\\)", display: false },
                        { left: "\\[", right: "\\]", display: true }
                    ],
                    throwOnError: false
                });
            } catch (error) {
                console.error('AlgorithmBox: Error during KaTeX rendering:', error);
            }
        } else if (retries > 0) {
            console.warn(`AlgorithmBox: KaTeX not ready, retrying in ${delay}ms... (${retries} retries left)`);
            setTimeout(() => this._attemptKaTeXRender(container, retries - 1, delay), delay);
        } else {
            console.warn('AlgorithmBox: KaTeX not available after multiple retries. Math rendering failed.');
        }
    }
}

customElements.define('algorithm-box', AlgorithmBox);