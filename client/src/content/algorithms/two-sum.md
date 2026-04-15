# Two Sum

## Description
Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`.
You may assume that each input would have exactly one solution, and you may not use the same element twice.
You can return the answer in any order.

## Example
**Input:** `nums = [2,7,11,15], target = 9`
**Output:** `[0,1]`
**Explanation:** Because `nums[0] + nums[1] == 9`, we return `[0, 1]`.

## Thinking Process
The problem asks us to find two numbers in an array that sum to a specific target value and return their indices.

### Approach 1: Brute Force
The most straightforward way is to check every possible pair of numbers in the array to see if they add up to the target.
We can use two nested loops: the outer loop iterates through each element, and the inner loop iterates through the remaining elements.

**Visualisation:**
`nums = [2, 7, 11, 15]`, `target = 9`
- i=0 (val 2):
  - j=1 (val 7): 2 + 7 = 9 == target. We found it! Return `[0, 1]`.

Time Complexity: O(n^2)
Space Complexity: O(1)

### Approach 2: Optimal Solution (Hash Map)
To improve the time complexity, we need a faster way to check if the complement (target - current number) exists in the array.
We can use a Hash Map to store the numbers we have seen so far and their indices.
As we iterate through the array, we calculate the complement for each number.
If the complement is in the Hash Map, we have found our pair! If not, we add the current number and its index to the Hash Map.

**Visualisation:**
`nums = [2, 7, 11, 15]`, `target = 9`
Map: `{}`
- i=0 (val 2): complement = 9 - 2 = 7. Is 7 in Map? No. Add 2 to Map: `{2: 0}`.
- i=1 (val 7): complement = 9 - 7 = 2. Is 2 in Map? Yes, at index 0. We found it! Return `[Map[2], 1] => [0, 1]`.

Time Complexity: O(n)
Space Complexity: O(n)

## Pseudo Code (Optimal)
```text
function twoSum(nums, target):
    create an empty hash map 'seen'
    for index i from 0 to nums.length - 1:
        complement = target - nums[i]
        if complement exists in 'seen':
            return [seen[complement], i]
        add nums[i] to 'seen' with value i
    return empty array (if no solution found, though problem guarantees one)
```

## Code Implementation

### Rust
```rust
use std::collections::HashMap;

impl Solution {
    // Brute Force
    pub fn two_sum_brute(nums: Vec<i32>, target: i32) -> Vec<i32> {
        for i in 0..nums.len() {
            for j in (i + 1)..nums.len() {
                if nums[i] + nums[j] == target {
                    return vec![i as i32, j as i32];
                }
            }
        }
        vec![]
    }

    // Optimal
    pub fn two_sum(nums: Vec<i32>, target: i32) -> Vec<i32> {
        let mut map = HashMap::new();
        for (i, &num) in nums.iter().enumerate() {
            let complement = target - num;
            if let Some(&index) = map.get(&complement) {
                return vec![index as i32, i as i32];
            }
            map.insert(num, i);
        }
        vec![]
    }
}
```

### Go
```go
// Brute Force
func twoSumBrute(nums []int, target int) []int {
    for i := 0; i < len(nums); i++ {
        for j := i + 1; j < len(nums); j++ {
            if nums[i] + nums[j] == target {
                return []int{i, j}
            }
        }
    }
    return []int{}
}

// Optimal
func twoSum(nums []int, target int) []int {
    seen := make(map[int]int)
    for i, num := range nums {
        complement := target - num
        if index, ok := seen[complement]; ok {
            return []int{index, i}
        }
        seen[num] = i
    }
    return []int{}
}
```

### TypeScript / JavaScript
```typescript
// Brute Force
function twoSumBrute(nums: number[], target: number): number[] {
    for (let i = 0; i < nums.length; i++) {
        for (let j = i + 1; j < nums.length; j++) {
            if (nums[i] + nums[j] === target) {
                return [i, j];
            }
        }
    }
    return [];
}

// Optimal
function twoSum(nums: number[], target: number): number[] {
    const seen = new Map<number, number>();
    for (let i = 0; i < nums.length; i++) {
        const complement = target - nums[i];
        if (seen.has(complement)) {
            return [seen.get(complement)!, i];
        }
        seen.set(nums[i], i);
    }
    return [];
}
```

### C++
```cpp
#include <vector>
#include <unordered_map>

using namespace std;

class Solution {
public:
    // Brute Force
    vector<int> twoSumBrute(vector<int>& nums, int target) {
        for (int i = 0; i < nums.size(); i++) {
            for (int j = i + 1; j < nums.size(); j++) {
                if (nums[i] + nums[j] == target) {
                    return {i, j};
                }
            }
        }
        return {};
    }

    // Optimal
    vector<int> twoSum(vector<int>& nums, int target) {
        unordered_map<int, int> seen;
        for (int i = 0; i < nums.size(); i++) {
            int complement = target - nums[i];
            if (seen.find(complement) != seen.end()) {
                return {seen[complement], i};
            }
            seen[nums[i]] = i;
        }
        return {};
    }
};
```
