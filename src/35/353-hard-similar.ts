import {
	appendOutput, readDataFromFile, inputFile, writeOutput,
	resolveCacheFile, writeDataToFile, appendDataToFile, readLines, problemName
} from '../read.js';
import { parentPort, workerData, isMainThread } from 'worker_threads';
import { StaticPool } from 'node-worker-threads-pool';
import { existsSync, mkdirSync } from 'fs';
import { resolve } from 'path';

import lodash from 'lodash';
const { min, minBy, maxBy, sortBy } = lodash;



export type Cell = { start: number; num: number, end: number; };
export type Coordinate = [Cell, Cell];
export type IsoForm = Coordinate[];
export type IsoFormInfo = { index: number; isoForm: IsoForm; length: number, delta: number, maxCoverLength: number };


export function solve353ExactHardSimilar() {
	const cacheInput = resolveCacheFile(problemName + '-sorted-input.txt');
	let testCount = 0;
	let input: string[] | undefined = readLines(inputFile);
	const [n, delta] = input[0].split(' ').map(Number);
	if (existsSync(cacheInput)) {
		testCount = Number(input[n + 1]);
	} else {
		const isoForms: { start: number, line: string }[] = new Array(n);
		let lastLine = 1;
		for (let i = 0; i < n; i++) {
			const line = input[lastLine++];
			const start = +line.substring(0, line.indexOf('-'));
			isoForms[i] = { start, line };
		}
		let newInput = isoForms.map((form, index) => ({ form, index }));
		newInput = sortBy(newInput, ni => ni.form.start);
		if (!existsSync(resolve(cacheInput, '..'))) {
			mkdirSync(resolve(cacheInput, '..'));
		}
		writeDataToFile(cacheInput, input[0]);
		for (const ni of newInput) {
			appendDataToFile(cacheInput, `\n${ni.index} `);
			appendDataToFile(cacheInput, ni.form.line);
		}
		appendDataToFile(cacheInput, '\n' + input[lastLine] + '\n');
		testCount = Number(input[lastLine++]);
		for (let i = 0; i < testCount; i++) {
			appendDataToFile(cacheInput, input[lastLine++]);
			appendDataToFile(cacheInput, '\n');
		}
		input = undefined;
		newInput = undefined as any;
	}

	const threadLimit = Math.pow(10, 3);
	const workerCount = ((testCount - (testCount % threadLimit)) / threadLimit) + ((testCount % threadLimit) > 0 ? 1 : 0);

	const staticPool = new StaticPool({
		size: 5,
		workerData: { file: cacheInput, problemName },
		task: './dist/35/353-hard-similar.js' //workerThread
	});

	const resultFiles: { index: number; output: string; }[] = [];
	for (let index = 0; index < workerCount; index++) {
		const start = threadLimit * index;
		let limit = threadLimit * (index + 1);
		if (limit > testCount) {
			limit = testCount;
		}
		const param = { start, limit, index };
		// console.log(threadId, param);
		staticPool.exec(param).then((result: { index: number, output: string }) => {
			resultFiles.push(result);
			console.log('finish', resultFiles.length, 'of', workerCount, '==>', result.index, result.output);
			if (resultFiles.length === workerCount) {
				const files = sortBy(resultFiles, 'index').map(r => r.output);
				console.log('concat files', files.length);
				writeOutput('');
				for (const file of files) {
					const data = readDataFromFile(file);
					appendOutput(data);
				}
				staticPool.destroy();
			}
		})
	}
}

if (!isMainThread) {
	const input = readDataFromFile(workerData.file).split('\n').map(s => s.trim());

	const [n, IgnoredDelta] = input[0].split(' ').map(Number);

	let lastLine = 1;
	const isoForms: IsoFormInfo[] = new Array(n);
	for (let i = 0; i < n; i++) {
		const lines = input[lastLine++].split(' ');
		const index = +lines[0];

		const firstCoordinate = lines[1].substring(0, lines[1].indexOf(',')).split('-').map(Number);
		const length = firstCoordinate[1] - firstCoordinate[0];
		const delta = (length / 2) - 1;
		const isoForm = lines[1]
			.split(',')
			.map(s => s
				.split('-')
				.map(Number)
				.map(m => ({ start: m - delta, num: m, end: m + delta })) as Coordinate
			);

		isoForms[i] = { index, isoForm, length, delta, maxCoverLength: length + (2 * delta) };
	}
	const testCount = Number(input[lastLine++]);
	// console.log(threadId, n, isoForms.length, testCount);

	const cacheName = (workerData.problemName as string).split('/')[1];

	parentPort!.on('message', param => workerThread(input, isoForms, lastLine + param.start, param.start, param.limit, param.index, cacheName));
}


export function workerThread(input: string[], isoForms: IsoFormInfo[], lastLine: number, start: number, limit: number, index: number, name: string) {
	const output = resolveCacheFile(name + '-' + index + '.txt');
	writeDataToFile(output, '');
	testLoop:
	for (let i = start; i < limit; i++) {
		const test = input[lastLine++].split(',').map(s => s.split('-').map(Number)) as [number, number][];

		const match = findBestMatch(test, isoForms);
		// console.log(i, testCount - i, match.index, match.count);
		// console.log(match.index, match.count);

		appendDataToFile(output, `${match}\n`);
	}
	parentPort?.postMessage({ index, output });
}

export function findBestMatch(test: [number, number][], isoForms: IsoFormInfo[]): number {
	if (test.length == 0) {
		return -1;
	}
	let matches: { count: number, isoForm: IsoFormInfo }[] = [];
	fullSearch:
	for (let index = 0; index < isoForms.length; index++) {
		const isoFormInfo = isoForms[index];
		if (isoFormInfo.isoForm.length < test.length) {
			continue;
		}
		if (!isInRange(test, isoFormInfo.isoForm)) {
			continue;
		}
		for (let x = 0; x < isoFormInfo.isoForm.length; x++) {
			if (isoFormInfo.isoForm.length - x < test.length) {
				continue fullSearch;
			}
			if (isReadSimilarToIsoForm(test[0], isoFormInfo.isoForm[x], isoFormInfo)) {
				const count = getReadMatchCount(isoFormInfo.delta, test, isoFormInfo.isoForm, x, isoFormInfo);
				if (count > 0) {
					matches.push({ count, isoForm: isoFormInfo });
				}
				continue fullSearch;
			}
		}
	}
	if (matches.length === 0) {
		// return -1;
		return findBestMatch(test.slice(1), isoForms);
	}
	const best = maxBy(matches, m => m.count)!;
	const allBestIsoForms = matches.filter(m => m.count == best.count).map(m => m.isoForm);
	const minDelta = minBy(allBestIsoForms, f => f.delta)!;

	const allMinDeltaMaxCount = allBestIsoForms.filter(f => f.delta == minDelta.delta).map(m => m.index)
	return min(allMinDeltaMaxCount)!;
}

export function getReadMatchCount(delta: number, test: [number, number][], isoForm: IsoForm, start: number, info: IsoFormInfo) {
	let count = 0;
	for (let i = 0, x = start, l = test.length - 1; i < l; i++, x++) {
		if (!isInBlockNoDelta(test[i], isoForm[x])) {
			return -1;
		} else {
			count++;
		}
	}
	const lastTest = test[test.length - 1], lastIsoForm = isoForm[start + test.length - 1];
	if (Math.abs(lastTest[0] - lastIsoForm[0].num) <= delta) {
		if (lastTest[1] <= (lastIsoForm[1].num + delta)) {
			count++;
		}
	}
	return count;
}

export function isReadSimilarToIsoForm(test: [number, number], isoForm: Coordinate, info: IsoFormInfo): boolean {
	const testStart = test[0];
	const testEnd = test[1];
	const testLength = testEnd - testStart;
	if (testLength > info.maxCoverLength) {
		return false;
	} else if (testLength == info.maxCoverLength) {
		if ((info.delta * 2) > oneBy3) {
			return false;
		}
		return true;
	}
	if (testStart >= isoForm[0].num && testEnd <= isoForm[1].end) {
		return true;
	} else if (testStart >= isoForm[0].start || testEnd <= isoForm[0].end) {
		return isReadApplySimilarity(test, isoForm);
	}
	return false;
}


const twoBy3 = 2 / 3;
const oneBy3 = 1 / 3;

export function isReadApplySimilarity(test: [number, number], isoForm: Coordinate) {
	const testStart = test[0];
	const testEnd = test[1];
	const testLength = testEnd - testStart;
	const exonLength = getCoveredExonLength(test, isoForm);
	const intronLength = getCoveredIntronLength(test, isoForm);
	if ((exonLength / testLength) > twoBy3) {
		return false;
	}
	if ((intronLength / testLength) > oneBy3) {
		return false;
	}
	return true;
}

export function getCoveredExonLength(test: [number, number], isoForm: Coordinate) {
	if (test[0] >= isoForm[0].num) {
		if (test[1] <= isoForm[1].num) {
			return test[1] - test[0];
		}
		return isoForm[1].num - test[0];
	}
	if (test[1] <= isoForm[1].num) {
		return test[1] - isoForm[0].num;
	}
	return isoForm[1].num - isoForm[0].num;
}

export function getCoveredIntronLength(test: [number, number], isoForm: Coordinate) {
	if (test[0] < isoForm[0].num && test[1] > isoForm[1].num) {
		return (isoForm[0].num - test[0]) + (test[1] - isoForm[1].num);
	} else if (test[0] < isoForm[0].num) {
		return isoForm[0].num - test[0];
	} else if (test[1] > isoForm[1].num) {
		return test[1] - isoForm[1].num;
	}
	return 0;
}


export function isIsoFormInRangeOfRead(isoForm: Coordinate, test: Coordinate) {
	return isoForm[0] >= test[0] && isoForm[0] <= test[0];
}

export function isReadMatchIsoFormByDelta(test: [number, number], isoForm: Coordinate) {
	return test[0] >= isoForm[0].start && inRangeOfCellEnd(test, isoForm);
}

export function isInBlockNoDelta(test: [number, number], isoForm: Coordinate) {
	return inRangeOfCellStart(test, isoForm) && inRangeOfCellEnd(test, isoForm);
}

export function inRangeOfCellStart(test: [number, number], isoForm: Coordinate) {
	return test[0] >= isoForm[0].start && test[0] <= isoForm[0].end;
}

export function inRangeOfCellEnd(test: [number, number], isoForm: Coordinate) {
	return test[1] >= isoForm[1].start && test[1] <= isoForm[1].end;
}

export function isInRange(test: [number, number][], isoForm: IsoForm) {
	const isoStart = isoForm[0][0].start;
	const isoEnd = isoForm[isoForm.length - 1][1].end;

	const readStart = test[0][1];
	const readEnd = test[test.length - 1][0];

	// return inRange(readStart, isoStart, isoEnd) && inRange(readEnd, isoStart, isoEnd);
	return readStart >= isoStart && readEnd <= isoEnd;
}

export function isOutOfRange(test: [number, number][], isoForm: IsoForm) {
	return isOutOfRangeLeft(test, isoForm) || isOutOfRangeRight(test, isoForm);
}

export function isOutOfRangeLeft(test: [number, number][], isoForm: IsoForm) {
	const isoStart = isoForm[0][0].start;
	// const isoEnd = isoForm[isoForm.length - 1][1].end;
	// const readStart = test[0][1];
	const readEnd = test[test.length - 1][0];
	return readEnd <= isoStart;
}

export function isOutOfRangeRight(test: [number, number][], isoForm: IsoForm) {
	// const isoStart = isoForm[0][0].start;
	const isoEnd = isoForm[isoForm.length - 1][1].end;
	const readStart = test[0][1];
	// const readEnd = test[test.length - 1][0];
	return readStart >= isoEnd;
}

