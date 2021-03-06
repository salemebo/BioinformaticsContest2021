import {
	appendOutput, readDataFromFile, readInfo,
	inputFile, readInput, writeOutput,
	resolveCacheFile, writeDataToFile, appendDataToFile, readLines, problemName
} from '../read.js';
import { parentPort, workerData, isMainThread, Worker, threadId } from 'worker_threads';
import { StaticPool } from 'node-worker-threads-pool';
import { existsSync, mkdirSync } from 'fs';
import lodash from 'lodash';
import { resolve } from 'path';
const { min, sortBy, inRange, max, find, uniq, sortedIndex, sortedIndexBy } = lodash;

export type Coordinate = [number, number];
export type IsoForm = Coordinate[];

export function solve352Exact() {
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
		workerData: { file: cacheInput },
		task: './dist/35/352.js' //workerThread
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

	const [n, delta] = input[0].split(' ').map(Number);

	let lastLine = 1;
	const isoForms: { index: number, isoForm: IsoForm }[] = new Array(n);
	for (let i = 0; i < n; i++) {
		const lines = input[lastLine++].split(' ');
		const index = +lines[0];
		const isoForm = lines[1]
			.split(',')
			.map(s => s
				.split('-')
				.map(Number) as Coordinate
			);
		isoForms[i] = { index, isoForm };
	}
	const testCount = Number(input[lastLine++]);
	console.log(threadId, n, isoForms.length, delta, testCount);

	parentPort!.on('message', param => workerThread(input, isoForms, delta, lastLine, param.start, param.limit, param.index));
}

export function workerThread(input: string[], isoForms: { index: number, isoForm: IsoForm }[], delta: number, lastLine: number, start: number, limit: number, index: number) {

	lastLine += start;
	const output = resolveCacheFile('easy-' + index + '.txt');

	writeDataToFile(output, '');
	testLoop:
	for (let i = start; i < limit; i++) {
		const test = input[lastLine++].split(',').map(s => s.split('-').map(Number)) as [number, number][];

		const match = findBestMath(delta, test, isoForms);
		// console.log(i, testCount - i, match.index, match.count);
		// console.log(match.index, match.count);

		appendDataToFile(output, `${match.index} ${match.count}\n`);
	}
	parentPort?.postMessage({ index, output });
}

export function findBestMath(delta: number, test: [number, number][], isoForms: { index: number, isoForm: IsoForm }[]) {
	const matches: number[] = [];
	fullSearch:
	for (let index = 0; index < isoForms.length; index++) {
		const isoForm = isoForms[index];
		if (isoForm.isoForm.length < test.length) {
			continue;
		}
		if (!isInRange(test, isoForm.isoForm)) {
			continue;
		}
		for (let x = 0; x < isoForm.isoForm.length; x++) {
			if (isoForm.isoForm.length - x < test.length) {
				continue fullSearch;
			}
			if (isReadMatchIsoFormByDelta(test[0], isoForm.isoForm[x])) {
				if (isReadMatchIsoForm(delta, test, isoForm.isoForm, x)) {
					// if (delta == 0) {
					// 	return { index, count: 1 };
					// }
					matches.push(isoForm.index);
				}
				continue fullSearch;
			}
		}
	}
	if (matches.length === 0) {
		return { index: -1, count: 0 };
	}
	return { index: min(matches), count: matches.length };
}

export function isReadMatchIsoForm(delta: number, test: [number, number][], isoForm: IsoForm, start: number) {
	for (let i = 1, x = start + 1, l = test.length - 1; i < l; i++, x++) {
		if (!isInBlockNoDelta(test[i], isoForm[x])) {
			return false;
		}
	}
	const lastTest = test[test.length - 1], lastIsoForm = isoForm[start + test.length - 1];
	if (Math.abs(lastTest[0] - lastIsoForm[0]) <= delta) {
		if (lastTest[1] <= (lastIsoForm[1] + delta)) {
			return true;
		}
	}
	return false;
}

export function isReadMatchIsoFormByDelta(test: [number, number], isoForm: Coordinate) {
	return test[0] >= isoForm[0] && inRangeOfCellEnd(test, isoForm);
}

export function isInBlockNoDelta(test: [number, number], isoForm: Coordinate) {
	return inRangeOfCellStart(test, isoForm) && inRangeOfCellEnd(test, isoForm);
}

export function inRangeOfCellStart(test: [number, number], isoForm: Coordinate) {
	return test[0] >= isoForm[0] && test[0] <= isoForm[0];
}

export function inRangeOfCellEnd(test: [number, number], isoForm: Coordinate) {
	return test[1] >= isoForm[1] && test[1] <= isoForm[1];
}

export function isInRange(test: [number, number][], isoForm: IsoForm) {
	const isoStart = isoForm[0][0];
	const isoEnd = isoForm[isoForm.length - 1][1];

	const readStart = test[0][1];
	const readEnd = test[test.length - 1][0];

	// return inRange(readStart, isoStart, isoEnd) && inRange(readEnd, isoStart, isoEnd);
	return readStart >= isoStart && readEnd <= isoEnd;
}

export function isOutOfRange(test: [number, number][], isoForm: IsoForm) {
	return isOutOfRangeLeft(test, isoForm) || isOutOfRangeRight(test, isoForm);
}

export function isOutOfRangeLeft(test: [number, number][], isoForm: IsoForm) {
	const isoStart = isoForm[0][0];
	// const isoEnd = isoForm[isoForm.length - 1][1].end;
	// const readStart = test[0][1];
	const readEnd = test[test.length - 1][0];
	return readEnd <= isoStart;
}

export function isOutOfRangeRight(test: [number, number][], isoForm: IsoForm) {
	// const isoStart = isoForm[0][0].start;
	const isoEnd = isoForm[isoForm.length - 1][1];
	const readStart = test[0][1];
	// const readEnd = test[test.length - 1][0];
	return readStart >= isoEnd;
}
