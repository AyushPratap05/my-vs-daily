import java.util.ArrayList; // Required for ArrayList
import java.util.List;      // Required for List interface

class Solution {

    /**
     * Helper recursive function to find all unique combinations that sum up to the target.
     * This function explores two main paths at each step: including the current element
     * (and potentially reusing it) or excluding the current element.
     *
     * @param ind The current index in the 'candidates' array being considered.
     * @param arr The array of candidate numbers.
     * @param target The remaining target sum that needs to be achieved.
     * @param ans The main list to store all valid combinations found.
     * @param ds The current combination being built in the recursive path.
     */
    private void findCombinations(int ind, int[] arr, int target, List<List<Integer>> ans, List<Integer> ds) {
        // Base Case: If we have considered all elements in the array
        if (ind == arr.length) {
            // If the target is exactly 0, it means the current combination (ds) sums up correctly
            if (target == 0) {
                // Add a new copy of the current combination to the answer list.
                // It's crucial to add a new ArrayList copy because 'ds' is a mutable object
                // that will be modified (backtracked) as the recursion unwinds.
                ans.add(new ArrayList<>(ds));
            }
            // In either case (target is 0 or not), we've processed this path fully, so return.
            return;
        }

        // Recursive Step 1: Option to INCLUDE the current element (arr[ind])
        // We can include the current element only if its value is less than or equal to the remaining target.
        if (arr[ind] <= target) {
            // Add the current element to the current combination.
            ds.add(arr[ind]);

            // Make a recursive call:
            // - 'ind' remains the same: This allows the current number (arr[ind]) to be reused multiple times.
            // - 'target' is reduced: Subtract the value of the current number from the remaining target.
            // - 'ans' and 'ds' are passed by reference.
            findCombinations(ind, arr, target - arr[ind], ans, ds);

            // BACKTRACK: Remove the last added element from 'ds'.
            // This step is vital for backtracking. It "undoes" the choice of including arr[ind],
            // allowing the algorithm to explore other paths where arr[ind] is not included
            // or where a different combination is formed.
            ds.remove(ds.size() - 1);
        }

        // Recursive Step 2: Option to EXCLUDE the current element (arr[ind])
        // Regardless of whether we included arr[ind] or not (or couldn't due to target),
        // we must explore the path where we skip the current element and move to the next one.
        // - 'ind + 1': Move to the next index to consider the subsequent elements.
        // - 'target' remains unchanged: As we did not use arr[ind].
        // - 'ans' and 'ds' are passed by reference.
        findCombinations(ind + 1, arr, target, ans, ds);
    }

    /**
     * Finds all unique combinations from 'candidates' where the numbers sum to 'target'.
     * The same number may be chosen from 'candidates' an unlimited number of times.
     *
     * @param candidates An array of unique candidate numbers.
     * @param target The target sum.
     * @return A list of lists, where each inner list is a unique combination of numbers
     * from 'candidates' that sums up to 'target'.
     */
    public List<List<Integer>> combinationSum(int[] candidates, int target) {
        // Initialize the list that will store all the final valid combinations.
        List<List<Integer>> ans = new ArrayList<>();

        // Start the recursive backtracking process.
        // - 0: Start considering elements from the first index.
        // - candidates: The array of numbers.
        // - target: The initial target sum.
        // - ans: The list to collect results.
        // - new ArrayList<>(): An empty list to start building the first combination.
        findCombinations(0, candidates, target, ans, new ArrayList<>());

        // Return the collected combinations.
        return ans;
    }
}
