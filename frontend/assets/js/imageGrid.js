// Responsive Image Grid with Modal
class ImageGridModal {
    constructor() {
        this.modal = null;
        this.init();
    }

    init() {
        this.createModal();
        this.setupImageClicks();
    }

    createModal() {
        this.modal = document.createElement('div');
        this.modal.className = 'fixed inset-0 bg-black bg-opacity-75 z-50 hidden';
        this.modal.innerHTML = `
            <div class="flex items-center justify-center min-h-screen p-4">
                <div class="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden">
                    <div class="relative">
                        <button id="modalClose" class="absolute top-2 right-2 text-white bg-black bg-opacity-50 rounded-full w-8 h-8 flex items-center justify-center z-10">
                            <i class="fas fa-times"></i>
                        </button>
                        <img id="modalImage" src="" alt="" class="w-full h-auto max-h-[70vh] object-cover">
                    </div>
                    <div class="p-4">
                        <h3 id="modalTitle" class="text-lg font-semibold mb-2"></h3>
                        <p id="modalDescription" class="text-gray-600"></p>
                        <button class="brand-bg text-white px-6 py-2 rounded-lg mt-4 w-full">
                            <i class="fas fa-play mr-2"></i>ស្ដាប់ឥឡូវ
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(this.modal);

        // Close modal events
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) this.hideModal();
        });

        document.getElementById('modalClose').addEventListener('click', () => {
            this.hideModal();
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.hideModal();
        });
    }

    setupImageClicks() {
        // Add click events to all article cards
        document.addEventListener('click', (e) => {
            const articleCard = e.target.closest('.article-card');
            if (articleCard) {
                const img = articleCard.querySelector('img');
                const title = articleCard.querySelector('h3')?.textContent;
                const description = articleCard.querySelector('p')?.textContent;
                const articleId = articleCard.dataset.articleId;

                if (img && title) {
                    this.showModal(img.src, title, description, articleId);
                }
            }
        });
    }

    showModal(imageSrc, title, description, articleId) {
        const modalImg = document.getElementById('modalImage');
        const modalTitle = document.getElementById('modalTitle');
        const modalDesc = document.getElementById('modalDescription');
        const playButton = this.modal.querySelector('button');

        modalImg.src = imageSrc;
        modalImg.alt = title;
        modalTitle.textContent = title;
        modalDesc.textContent = description || '';

        // Update play button to navigate to article page
        playButton.onclick = () => {
            window.location.href = `/article?id=${articleId}`;
        };

        this.modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }

    hideModal() {
        this.modal.classList.add('hidden');
        document.body.style.overflow = 'auto';
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.imageGridModal = new ImageGridModal();
});