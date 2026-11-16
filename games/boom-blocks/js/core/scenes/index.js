// Every playground, in the order the playground picker shows them.
import tower from './tower.js';
import castle from './castle.js';
import city from './city.js';
import garden from './garden.js';
import bay from './bay.js';
import snow from './snow.js';
import space from './space.js';
import fair from './fair.js';
import trucks from './trucks.js';
import jungle from './jungle.js';
import farm from './farm.js';
import toys from './toys.js';
import train from './train.js';
import cake from './cake.js';
import { Builder } from '../builders.js';
import { rng } from '../rng.js';

export const SCENES = [tower, castle, city, garden, bay, snow, space, fair, trucks, jungle, farm, toys, train, cake];

export const sceneById = (id) => SCENES.find((s) => s.id === id) || SCENES[0];

// Fills the grid with a scene. Returns the builder, which holds the scene's props and gifts.
export function buildScene(grid, scene, seed) {
  grid.reset();
  const b = new Builder(grid, rng(seed));
  scene.build(b);
  b.hollowOut(2);
  grid.markSupport();
  return b;
}
