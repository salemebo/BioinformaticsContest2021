import { appendOutput, readInfo, readInput, writeOutput } from '../read.js';

import lodash from 'lodash';
const { max, find, uniq, sortedIndexBy } = lodash;

export type Contact = { a: number, b: number, p: number };

export function solve351() {

	const input = readInput().split('\n').map(s => s.trim());

	const [n, delta] = input[0].split(' ').map(Number);
	input.splice(0, 1);

	let lastLine = 0;
	const paths: [number, number][][] = new Array(n);
	for (let i = 0; i < n; i++) {
		paths[i] = input[lastLine++].split(',').map(s => s.split('-').map(Number)) as [number, number][];
	}

	const testCount = Number(input[lastLine++]);

	// console.log(testCount, n, delta, paths);
	writeOutput('');
	testLoop:
	for (let i = 0; i < testCount; i++) {
		const test = input[lastLine++].split(',').map(s => s.split('-').map(Number)) as [number, number][];

		const match = searchIndex(delta, test, paths);
		console.log(match, i, testCount - i);

		appendOutput(`${match.index} ${match.count}\n`);

		// let index = -1;

		// whileLoop:
		// do {
		// 	const match = findFirstMatch(++index, delta, test, paths);
		// 	if (match.index === paths.length) {
		// 		appendOutput(`-1 0\n`);
		// 		continue testLoop;
		// 	}
		// 	const isoForm = match.isoForm!;
		// 	// start match
		// 	let matchCount = isFullMatching(delta, test[0], isoForm[match.start!]) ? 1 : 0;
		// 	// end match
		// 	const se = isStartMatching(delta, test[test.length - 1], isoForm[match.start! + test.length - 1]);
		// 	if (!se) {
		// 		// not match, break chain
		// 		index = match.index;
		// 		continue whileLoop;
		// 	}
		// 	const ee = isEndMatching(delta, test[test.length - 1], isoForm[match.start! + test.length - 1]);
		// 	if (ee) {
		// 		matchCount++;
		// 	}

		// 	for (let j = 1, s = match.start! + 1; j < test.length - 1 && s < isoForm.length - 1; j++, s++) {
		// 		const isFull = isFullMatching(delta, test[j], isoForm[s]);
		// 		if (isFull) {
		// 			matchCount++;
		// 		} else {
		// 			// not match, break chain
		// 			index = match.index;
		// 			continue whileLoop;
		// 		}
		// 	}
		// 	if (matchCount == 0) {
		// 		index = match.index;
		// 		continue whileLoop;
		// 	}
		// 	appendOutput(`${match.index} ${matchCount}\n`);
		// 	continue testLoop;
		// } while (index <= paths.length);
	}
}

export function searchIndex(delta: number, test: [number, number][], isoForms: [number, number][][]) {
	fullSearch:
	for (let index = 0; index < isoForms.length; index++) {
		const isoForm = isoForms[index];
		for (let x = 0; x < isoForm.length; x++) {
			if (isInBlock(delta, test[0], isoForm[x])) {
				const count = getMatchCount(delta, test, isoForm, x);
				if (count > 0) {
					return { index, count };
				}
				continue fullSearch;
			}
		}
	}
	anySearch:
	for (let index = 0; index < isoForms.length; index++) {
		const isoForm = isoForms[index];
		for (let x = 0; x < isoForm.length; x++) {
			if (isEndInBlock(delta, test[0], isoForm[x])) {
				const count = getMatchCount(delta, test, isoForm, x);
				if (count > 0) {
					return { index, count };
				}
				continue anySearch;
			}
		}
	}
	return { index: -1, count: 0 };;
}

export function getMatchCount(delta: number, test: [number, number][], isoForms: [number, number][], start: number) {
	if (test.length > isoForms.length - start) {
		return 0;
	}
	let matchCount = 0;
	for (let i = 0, x = start; i < test.length; i++, x++) {
		const testBlock = test[i];
		const isoBlock = isoForms[x];
		if (i == 0) {
			if (isInBlock(delta, testBlock, isoBlock)) {
				matchCount++;
				continue;
			}
			if (isEndInBlock(delta, testBlock, isoBlock)) {
				continue;
			}
			return 0;
		} else if (i < test.length - 1) {
			if (isInBlock(delta, testBlock, isoBlock)) {
				matchCount++;
				continue;
			}
			return 0;
		} else if (i == test.length - 1) {
			if (isInBlock(delta, testBlock, isoBlock)) {
				matchCount++;
				break;
			}
			if (isStartInBlock(delta, testBlock, isoBlock)) {
				break;
			}
			return 0;
		}
	}
	return matchCount;
}

export function isInBlock(delta: number, test: [number, number], isoForm: [number, number]) {

	if (test[0] == isoForm[0] && test[1] == isoForm[1]) {
		return true;
	}

	if (Math.abs(isoForm[0] - test[0]) <= delta && Math.abs(isoForm[1] - test[1]) <= delta) {
		return true;
	}
	return false;
}

export function isStartInBlock(delta: number, test: [number, number], isoForm: [number, number]) {

	if (test[0] == isoForm[0]) {
		return true;
	}

	if (Math.abs(isoForm[0] - test[0]) <= delta) {
		return true;
	}
	return false;
}

export function isEndInBlock(delta: number, test: [number, number], isoForm: [number, number]) {

	if (test[1] == isoForm[1]) {
		return true;
	}
	if (Math.abs(isoForm[1] - test[1]) <= delta) {
		return true;
	}
	return false;
}



// export function findFullMatch(index: number, delta: number, test: [number, number], isoForms: [number, number][][]) {
// 	for (; index < isoForms.length; index++) {
// 		const isoForm = isoForms[index];
// 		if (isFullMatching(delta, test, isoForm[0])) {
// 			return { index, start: 0, isoForm };
// 		}
// 	}
// 	return { index };
// }

// export function findFullMatchIn(index: number, delta: number, test: [number, number], isoForms: [number, number][][]) {
// 	for (; index < isoForms.length; index++) {
// 		const isoForm = isoForms[index];
// 		const start = sortedIndexBy(isoForm, test, a => isFullMatching(delta, test, a));
// 		if (start < isoForm.length && start > 0) {
// 			return { index, start, isoForm };
// 		}
// 	}
// 	return { index };
// }


// export function findFirstMatch(index: number, delta: number, tests: [number, number][], isoForms: [number, number][][]) {
// 	for (; index < isoForms.length; index++) {
// 		const isoForm = isoForms[index];
// 		if (isoForm.length < tests.length) {
// 			continue;
// 		}
// 		if (isEndMatching(delta, tests[0], isoForm[0]) && isStartMatching(delta, tests[1], isoForm[1])) {
// 			return { index, start: 0, isoForm };
// 		}
// 		// if (tests[0][0] > isoForm[0][1]) {
// 		// 	const start = sortedIndexBy(isoForm, tests[0], a => isStartMatching(delta, tests[0], a));
// 		// 	if (start < isoForm.length && start > 0) {
// 		// 		return { index, start, isoForm };
// 		// 	}
// 		// }
// 	}
// 	return { index };
// }

// export function isConnectMatch(delta: number, tests: [number, number][], isoForms: [number, number][], testStart: number, isoStart: number) {
// 	for (let i = testStart; i < tests.length; i++) {
// 		if (!(isEndMatching(delta, tests[i], isoForms[isoStart + i]) && isStartMatching(delta, tests[i + 1], isoForms[isoStart + i]))) {
// 			return false;
// 		}
// 	}
// 	return true;
// }


// export function isStartMatching(delta: number, test: [number, number], isoForm: [number, number]) {
// 	return isMatching(0, delta, test, isoForm);
// }

// export function isEndMatching(delta: number, test: [number, number], isoForm: [number, number]) {
// 	return isMatching(1, delta, test, isoForm);
// }

// export function isFullMatching(delta: number, test: [number, number], isoForm: [number, number]) {
// 	return isMatching(0, delta, test, isoForm) && isMatching(1, delta, test, isoForm);
// }

// export function isNotFullMatching(delta: number, test: [number, number], isoForm: [number, number]) {
// 	return !isMatching(0, delta, test, isoForm) || !isMatching(1, delta, test, isoForm);
// }

// export function isMatching(index: number, delta: number, test: [number, number], isoForm: [number, number]) {
// 	if (test[index] == isoForm[index]) {
// 		return true;
// 	}
// 	// can correct the error
// 	else if (Math.abs(isoForm[index] - test[index]) <= delta) {
// 		return true;
// 	}
// 	return false;
// }
