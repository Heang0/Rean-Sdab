// Horizontal categories scroll functionality
class CategoriesScroll {
    constructor() {
        this.container = document.getElementById('categoriesContainer');
        this.scrollLeftBtn = document.getElementById('scrollLeft');
        this.scrollRightBtn = document.getElementById('scrollRight');
        
        if (this.container) {
            this.init();
        }
    }

    init() {
        this.setupEventListeners();
        this.updateScrollButtons();
    }

    setupEventListeners() {
        // Scroll buttons
        if (this.scrollLeftBtn) {
            this.scrollLeftBtn.addEventListener('click', () => {
                this.scroll(-200);
            });
        }

        if (this.scrollRightBtn) {
            this.scrollRightBtn.addEventListener('click', () => {
                this.scroll(200);
            });
        }

        // Touch swipe for mobile
        let startX;
        let scrollLeft;

        this.container.addEventListener('touchstart', (e) => {
            startX = e.touches[0].pageX;
            scrollLeft = this.container.scrollLeft;
        });

        this.container.addEventListener('touchmove', (e) => {
            if (!startX) return;
            const x = e.touches[0].pageX;
            const walk = (x - startX) * 2;
            this.container.scrollLeft = scrollLeft - walk;
        });

        // Scroll event to update buttons
        this.container.addEventListener('scroll', () => {
            this.updateScrollButtons();
        });

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft') {
                this.scroll(-200);
            } else if (e.key === 'ArrowRight') {
                this.scroll(200);
            }
        });
    }

    scroll(amount) {
        this.container.scrollBy({
            left: amount,
            behavior: 'smooth'
        });
    }

    updateScrollButtons() {
        if (!this.scrollLeftBtn || !this.scrollRightBtn) return;

        const scrollLeft = this.container.scrollLeft;
        const scrollWidth = this.container.scrollWidth;
        const clientWidth = this.container.clientWidth;

        // Show/hide left button
        if (scrollLeft > 0) {
            this.scrollLeftBtn.classList.remove('opacity-0', 'invisible');
            this.scrollLeftBtn.classList.add('opacity-100', 'visible');
        } else {
            this.scrollLeftBtn.classList.add('opacity-0', 'invisible');
            this.scrollLeftBtn.classList.remove('opacity-100', 'visible');
        }

        // Show/hide right button
        if (scrollLeft < scrollWidth - clientWidth - 10) {
            this.scrollRightBtn.classList.remove('opacity-0', 'invisible');
            this.scrollRightBtn.classList.add('opacity-100', 'visible');
        } else {
            this.scrollRightBtn.classList.add('opacity-0', 'invisible');
            this.scrollRightBtn.classList.remove('opacity-100', 'visible');
        }
    }
}

// Initialize categories scroll
document.addEventListener('DOMContentLoaded', () => {
    window.categoriesScroll = new CategoriesScroll();
});