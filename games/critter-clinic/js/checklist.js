// The check-up: seven steps in the order a real one goes (any order works), and what the
// narrator says for each. Pure, so the tests can use it.

export const STEPS = ['measure', 'temp', 'heart', 'ears', 'ahh', 'reflex', 'shot'];

export const STEP_INFO = {
  measure: { name: 'Height and weight!', prompt: 'Tap the scale, so they can hop on!', cheer: 'Wow, so big!', label: 'Height and weight' },
  temp: { name: 'Thermometer!', prompt: 'Slide it across the forehead!', cheer: 'No fever!', hot: "A little hot! Let's help them feel better!", label: 'Thermometer' },
  heart: { name: 'Stethoscope!', prompt: 'Listen to the heart!', cheer: 'A strong heart!', label: 'Stethoscope' },
  ears: { name: 'Ear camera!', prompt: 'Look inside the ears!', cheer: 'Healthy ears!', label: 'Ear camera' },
  ahh: { name: 'Say ahh!', prompt: 'Look inside the mouth!', cheer: 'Nice and pink!', label: 'Say ahh light' },
  reflex: { name: 'Knee hammer!', prompt: 'Tap the knees!', cheer: 'Great reflexes!', label: 'Knee hammer' },
  shot: { name: 'Shot!', prompt: 'First, clean the arm!', cheer: 'So brave!', label: 'Shot' },
};

export const CHEERS = ['Great job, Doctor!', 'Super!', 'Nice work, Doctor!', 'You did it!', 'Wonderful!'];

export const nextStep = (done) => STEPS.find((s) => !done.includes(s)) ?? null;
export const isComplete = (done) => STEPS.every((s) => done.includes(s));
export const markDone = (done, id) => (STEPS.includes(id) && !done.includes(id) ? [...done, id] : done);
