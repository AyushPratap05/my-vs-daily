document.addEventListener('DOMContentLoaded', () => {
    // Task 7 & 9: New recommendations functionality

    const recommendationForm = document.getElementById('recommendation-form');
    const newRecommendationText = document.getElementById('new-recommendation-text');
    const recommenderNameInput = document.getElementById('recommender-name');
    const submitRecommendationBtn = document.getElementById('submit-recommendation-btn');
    const recommendationsList = document.getElementById('recommendations-list');

    submitRecommendationBtn.addEventListener('click', () => {
        const recommendationMessage = newRecommendationText.value.trim();
        const recommender = recommenderNameInput.value.trim();

        if (recommendationMessage === "") {
            alert("Please enter a recommendation message!");
            return;
        }

        // Create new recommendation item
        const newRecommendationItem = document.createElement('div');
        newRecommendationItem.classList.add('recommendation-item');

        const messageParagraph = document.createElement('p');
        messageParagraph.textContent = `"${recommendationMessage}"`; // Wrap in quotes

        const recommenderParagraph = document.createElement('p');
        recommenderParagraph.classList.add('recommender');
        recommenderParagraph.textContent = recommender ? `- ${recommender}` : '- Anonymous'; // Default to Anonymous if name is empty

        newRecommendationItem.appendChild(messageParagraph);
        newRecommendationItem.appendChild(recommenderParagraph);

        // Add the new recommendation to the list
        // Appending to the end makes sense for new recommendations
        recommendationsList.appendChild(newRecommendationItem);

        // Clear the form fields
        newRecommendationText.value = '';
        recommenderNameInput.value = '';

        // Task 9: Show pop-up message with confirmation dialogue
        alert("Thank you for your recommendation!"); // This fulfills the requirement for a pop-up confirmation
    });

    // Optional: Smooth scroll for the "scroll-to-top" button (if you included it in HTML)
    // You can remove this if you don't use the scroll-to-top button
    const scrollToTopBtn = document.querySelector('.scroll-to-top');
    if (scrollToTopBtn) {
        // Show/hide scroll-to-top button based on scroll position
        window.addEventListener('scroll', () => {
            if (window.scrollY > 200) { // Show button after scrolling down 200px
                scrollToTopBtn.style.display = 'flex';
            } else {
                scrollToTopBtn.style.display = 'none';
            }
        });
        // Ensure it's hidden on initial load if not scrolled
        scrollToTopBtn.style.display = 'none';
    }
});
