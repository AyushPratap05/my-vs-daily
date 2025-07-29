// Ensure the script runs only after the entire HTML document is loaded
document.addEventListener('DOMContentLoaded', () => {

    // --- References to HTML elements ---
    const principalInput = document.getElementById('principal');
    const rateInput = document.getElementById('rate'); // The slider input
    const rateValueSpan = document.getElementById('rate_val'); // The span next to the slider
    const yearsInput = document.getElementById('time'); // The years input (datalist type="text")
    const calculateBtn = document.getElementById('calculateBtn'); // The Compute Interest button
    const resultSpan = document.getElementById('result'); // The span to display results

    // --- Function to update the Rate Slider Value ---
    function updateRate() {
        // Get the current value from the 'Rate' slider
        var rateval = rateInput.value;

        // Display this value in the span with id 'rate_val'
        rateValueSpan.textContent = rateval;
    }

    // --- Link updateRate() function with an "onchange" event on the range input ---
    // This will make the span update as the slider is moved.
    rateInput.addEventListener('input', updateRate); // Use 'input' for continuous updates as slider moves
    // Or, if you prefer 'change' for update only after releasing the slider:
    // rateInput.addEventListener('change', updateRate);

    // Initial call to updateRate() to display the default value (10.25) when the page loads
    updateRate();

    // --- Compute Button Functionality ---
    // Link the compute() function with the calculate button's click event
    calculateBtn.addEventListener('click', compute);

    function compute() {
        // Clear previous results and error messages
        resultSpan.innerHTML = ''; // Clear results
        principalInput.classList.remove('error-highlight'); // Remove any error highlights

        // Get values from inputs
        const principal = parseFloat(principalInput.value); // Parse as float, as per general interest calculations
        const rate = parseFloat(rateInput.value); // Already a float from range input
        const years = parseFloat(yearsInput.value); // Parse as float, even though it's type="text" with datalist

        // --- Input Validation for "Principal" ---
        if (isNaN(principal) || principal <= 0) {
            alert("Enter a positive number for Principal!");
            principalInput.focus(); // Set focus back to the principal input
            principalInput.classList.add('error-highlight'); // Optionally add a visual highlight for error
            return; // Stop the function if validation fails
        }
        // Add similar validation for Rate and Years if needed, based on your lab's exact requirements
        if (isNaN(rate) || rate < 0) {
             alert("Enter a non-negative number for Rate!");
             rateInput.focus();
             rateInput.classList.add('error-highlight');
             return;
        }
        if (isNaN(years) || years <= 0) {
             alert("Enter a positive number for No. of Years!");
             yearsInput.focus();
             yearsInput.classList.add('error-highlight');
             return;
        }


        // --- Calculate Simple Interest ---
        const interest = principal * years * rate / 100;

        // --- Calculate Total Amount ---
        // Note: The instruction asked for 'amount which is the sum of the integer value of principal and the float value of interest'
        // This implies 'principal' might be treated as int, but 'interest' as float.
        // Given 'principal' is usually money, it's safer to keep it as float for addition.
        const amount = principal + interest;

        // --- Convert 'No. of Years' into the actual year in the future ---
        const currentYear = new Date().getFullYear();
        const futureYear = currentYear + years;

        // --- Set the inner HTML property of the result span ---
        // Using <mark> tag for highlighting numbers and <br> for line breaks
        resultSpan.innerHTML =
            "If you deposit $<mark>" + principal.toFixed(2) + "</mark>,<br>" + // Format principal to 2 decimal places
            "at an interest rate of <mark>" + rate.toFixed(2) + "%" + "</mark>.<br>" + // Format rate to 2 decimal places
            "You will receive an amount of $<mark>" + amount.toFixed(2) + "</mark>,<br>" + // Format amount to 2 decimal places
            "in the year <mark>" + futureYear + "</mark><br>"; // Future year is an integer

        // Clear input fields after successful calculation (optional, but good UX)
        principalInput.value = '';
        yearsInput.value = '';
        // The rate slider retains its position, which is usually desired.
    }
});