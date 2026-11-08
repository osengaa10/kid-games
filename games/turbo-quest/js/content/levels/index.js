// Every level, by id. ORDER is the order they're played in (the practice field isn't in it).
import greybox from './greybox.js';
import w11 from './w1-1.js';
import w12 from './w1-2.js';
import w13 from './w1-3.js';
import w1b from './w1-b.js';

export const LEVELS = { 'w1-1': w11, 'w1-2': w12, 'w1-3': w13, 'w1-b': w1b, greybox };
export const ORDER = ['w1-1', 'w1-2', 'w1-3', 'w1-b'];
