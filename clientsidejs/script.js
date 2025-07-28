// Function to run when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM is ready!");

    // 1. Get references to HTML elements
    const mainHeading = document.getElementById('main-heading');
    const changeHeadingTextBtn = document.getElementById('change-heading-text-btn');
    const changeHeadingColorBtn = document.getElementById('change-heading-color-btn');
    const newItemInput = document.getElementById('new-item-input');
    const addItemBtn = document.getElementById('add-item-btn');
    const dynamicList = document.getElementById('dynamic-list');
    const hoverBox = document.getElementById('hover-box');

    let isRed = false; // State variable for color toggle

    // 2. Add event listeners to buttons

    // Change Heading Text
    changeHeadingTextBtn.addEventListener('click', () => {
        mainHeading.textContent = "JavaScript Makes Pages Dynamic!";
    });

    // Toggle Heading Color using .style
    changeHeadingColorBtn.addEventListener('click', () => {
        if (isRed) {
            mainHeading.style.color = "#0056b3"; // Original blue
        } else {
            mainHeading.style.color = "red";
        }
        isRed = !isRed; // Toggle the state
    });

    // Add Item to List (using createElement and appendChild)
    addItemBtn.addEventListener('click', () => {
        const itemText = newItemInput.value.trim(); // Get value and remove whitespace
        if (itemText !== "") { // Only add if input is not empty
            const newItem = document.createElement('li'); // Create new <li>
            newItem.textContent = itemText; // Set its text content

            // Optional: Add a class to new items
            newItem.classList.add('highlight');

            dynamicList.appendChild(newItem); // Append to the <ul>
            newItemInput.value = ""; // Clear the input field
        }
    });

    // 3. Add hover effects using classList
    hoverBox.addEventListener('mouseenter', () => {
        hoverBox.classList.add('hovered'); // Add the 'hovered' class on mouse enter
    });

    hoverBox.addEventListener('mouseleave', () => {
        hoverBox.classList.remove('hovered'); // Remove the 'hovered' class on mouse leave
    });

    // Initial message on load (could also be done with window.onload, but DOMContentLoaded is faster for DOM access)
    console.log("All elements are now available for manipulation.");
});