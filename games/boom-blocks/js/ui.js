// Everything on screen that isn't the 3D world: big round picture buttons (no words), the combo
// bubble, the ghost hand that shows what to do, and the loading blocks.
import { isMuted } from './audio.js';

export const ICONS = {
  meteor: `<svg viewBox="0 0 100 100"><defs><linearGradient id="mt-tail" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff6a8" stop-opacity="0"/><stop offset=".4" stop-color="#ffd23f"/><stop offset=".75" stop-color="#ff7b2e"/><stop offset="1" stop-color="#ff3b5c"/></linearGradient><radialGradient id="mt-rock" cx=".38" cy=".32" r=".75"><stop offset="0" stop-color="#c9a2ef"/><stop offset=".55" stop-color="#7a4fb0"/><stop offset="1" stop-color="#43286b"/></radialGradient></defs><path d="M4 6C28 16 50 30 72 44L52 68C38 50 20 30 4 6Z" fill="url(#mt-tail)"/><path d="M10 28C30 36 44 46 58 58L50 64C38 52 24 40 10 28Z" fill="#ff9f1c" opacity=".85"/><path d="M28 4C42 16 54 28 66 40L58 48C48 34 38 20 28 4Z" fill="#ffe066" opacity=".9"/><path d="M62 38L80 36L93 51L91 72L75 89L54 87L43 71L47 51Z" fill="url(#mt-rock)" stroke="#2a1745" stroke-width="3.5" stroke-linejoin="round"/><circle cx="62" cy="58" r="6.5" fill="#55357f"/><circle cx="79" cy="73" r="5" fill="#55357f"/><circle cx="81" cy="50" r="3.5" fill="#55357f"/><path d="M51 75L61 70L66 79M70 51L74 61L85 62" stroke="#ffb020" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/><ellipse cx="60" cy="46" rx="7" ry="3" fill="#fff" opacity=".5" transform="rotate(-25 60 46)"/><path d="M20 56l2.2 5.2 5.2 2.2-5.2 2.2-2.2 5.2-2.2-5.2-5.2-2.2 5.2-2.2z" fill="#fff"/><path d="M86 14l1.6 4 4 1.6-4 1.6-1.6 4-1.6-4-4-1.6 4-1.6z" fill="#fff"/></svg>`,
  ball: `<svg viewBox="0 0 100 100"><defs><radialGradient id="wb-ball" cx=".34" cy=".3" r=".8"><stop offset="0" stop-color="#ffffff"/><stop offset=".3" stop-color="#ffeef2"/><stop offset="1" stop-color="#cfc4cc"/></radialGradient><clipPath id="wb-clip"><circle cx="56" cy="65" r="28"/></clipPath></defs><rect x="8" y="3" width="84" height="11" rx="5.5" fill="#ffd23f" stroke="#9c7200" stroke-width="3"/><g fill="none" stroke="#5d6378" stroke-width="4"><ellipse cx="56" cy="20" rx="4" ry="6.5"/><ellipse cx="56" cy="31" rx="2.2" ry="6.5"/></g><circle cx="56" cy="65" r="28" fill="url(#wb-ball)"/><g clip-path="url(#wb-clip)" fill="#ff3b5c"><path d="M14 44L30 34L98 92L82 102Z"/><path d="M34 28L48 20L104 66L94 78Z"/><path d="M8 66L18 56L72 104L56 108Z"/></g><circle cx="56" cy="65" r="28" fill="none" stroke="#6e0f26" stroke-width="3.5"/><ellipse cx="45" cy="52" rx="8" ry="4.5" fill="#fff" opacity=".85" transform="rotate(-35 45 52)"/><path d="M10 52q-6 13 0 26M19 47q-6 17 0 34" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round"/></svg>`,
  laser: `<svg viewBox="0 0 100 100"><defs><linearGradient id="lz-beam" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff4d4d"/><stop offset=".25" stop-color="#ffd23f"/><stop offset=".5" stop-color="#5fd35f"/><stop offset=".75" stop-color="#2ec4f1"/><stop offset="1" stop-color="#b15cff"/></linearGradient><radialGradient id="lz-body" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#b6f5ff"/><stop offset=".55" stop-color="#2ec4f1"/><stop offset="1" stop-color="#11679a"/></radialGradient></defs><g transform="rotate(12 74 72)"><rect x="61" y="59" width="26" height="26" rx="4" fill="#ff9f1c" stroke="#8c4400" stroke-width="3"/><path d="M61 72h26M74 59v26" stroke="#8c4400" stroke-width="2" opacity=".5"/></g><path d="M41 40L72 68" stroke="url(#lz-beam)" stroke-width="15" stroke-linecap="round"/><path d="M41 40L72 68" stroke="#fff" stroke-width="5" stroke-linecap="round"/><path d="M72 68l4-13 3 11 13-3-10 8 10 8-13-3-2 13-5-11-11 6 8-10-10-8 13 1z" fill="#fff36b" stroke="#ff8a00" stroke-width="1.5" stroke-linejoin="round"/><line x1="29" y1="8" x2="29" y2="16" stroke="#4f5568" stroke-width="3"/><circle cx="29" cy="7" r="5" fill="#ff5fa2" stroke="#9c1f5e" stroke-width="2"/><circle cx="29" cy="34" r="20" fill="url(#lz-body)" stroke="#0b456b" stroke-width="3.5"/><path d="M9.5 37q19.5 9 39 0" stroke="#ffd23f" stroke-width="5" fill="none" stroke-linecap="round"/><circle cx="35" cy="30" r="9.5" fill="#fff" stroke="#0b456b" stroke-width="2.5"/><circle cx="38" cy="32" r="4.8" fill="#163a63"/><circle cx="39.5" cy="30.3" r="1.6" fill="#fff"/></svg>`,
  bomb: `<svg viewBox="0 0 100 100"><defs><radialGradient id="bm-body" cx=".34" cy=".3" r=".85"><stop offset="0" stop-color="#7a82a8"/><stop offset=".45" stop-color="#2b2f45"/><stop offset="1" stop-color="#0d0f18"/></radialGradient><linearGradient id="bm-cap" x1="0" x2="1"><stop offset="0" stop-color="#d7dceb"/><stop offset="1" stop-color="#727a93"/></linearGradient></defs><circle cx="44" cy="62" r="32" fill="url(#bm-body)" stroke="#04050a" stroke-width="3.5"/><g transform="rotate(-14 44 29)"><rect x="32" y="21" width="24" height="15" rx="3.5" fill="url(#bm-cap)" stroke="#353a50" stroke-width="3"/></g><path d="M49 23C53 10 66 8 73 17" stroke="#c98a4b" stroke-width="5.5" fill="none" stroke-linecap="round"/><path d="M76 17l3.5-11 3 10 10-3.5-8 7.5 9 6.5-11-1.5-1 11-4.5-10-10 4.5 7-8.5-9-6 11 .5z" fill="#ffe14d" stroke="#ff7b2e" stroke-width="1.5" stroke-linejoin="round"/><circle cx="77" cy="18" r="4" fill="#fff"/><ellipse cx="31" cy="49" rx="10" ry="6" fill="#fff" opacity=".38" transform="rotate(-35 31 49)"/><circle cx="24" cy="61" r="3" fill="#fff" opacity=".3"/></svg>`,
  hammer: `<svg viewBox="0 0 100 100"><defs><linearGradient id="hm-head" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffb3d5"/><stop offset=".5" stop-color="#ff5fa2"/><stop offset="1" stop-color="#d23a7e"/></linearGradient><linearGradient id="hm-stick" x1="0" x2="1"><stop offset="0" stop-color="#ffe680"/><stop offset="1" stop-color="#e8b400"/></linearGradient></defs><path d="M10 82l5 8 4-9 9 2-6-7 6-7-9 2-4-9-5 8-9-2 6 7-6 7z" fill="#fff36b" stroke="#ff8a00" stroke-width="1.5" stroke-linejoin="round"/><g transform="rotate(-32 54 46)"><rect x="49" y="42" width="12" height="54" rx="6" fill="url(#hm-stick)" stroke="#9c7200" stroke-width="3"/><rect x="18" y="12" width="66" height="34" rx="12" fill="url(#hm-head)" stroke="#7d1848" stroke-width="3.5"/><rect x="13" y="9" width="16" height="40" rx="7" fill="#ffc9e2" stroke="#7d1848" stroke-width="3.5"/><rect x="73" y="9" width="16" height="40" rx="7" fill="#ffc9e2" stroke="#7d1848" stroke-width="3.5"/><rect x="33" y="18" width="36" height="6" rx="3" fill="#fff" opacity=".5"/></g><path d="M30 72q8-4 14 2M24 64q8-6 16 0" stroke="#fff" stroke-width="3.5" fill="none" stroke-linecap="round"/></svg>`,
  cannon: `<svg viewBox="0 0 100 100"><defs><linearGradient id="cn-barrel" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7d8cc4"/><stop offset=".5" stop-color="#2b3a67"/><stop offset="1" stop-color="#141c38"/></linearGradient><radialGradient id="cn-ball" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#9aa0c0"/><stop offset=".5" stop-color="#2b2f45"/><stop offset="1" stop-color="#0d0f18"/></radialGradient></defs><circle cx="70" cy="31" r="10" fill="#fff" opacity=".95"/><circle cx="80" cy="40" r="7" fill="#fff" opacity=".9"/><circle cx="62" cy="22" r="6" fill="#fff" opacity=".85"/><circle cx="86" cy="13" r="9" fill="url(#cn-ball)" stroke="#04050a" stroke-width="2.5"/><path d="M70 20l4-3M74 26l5-1" stroke="#fff" stroke-width="3" stroke-linecap="round"/><g transform="rotate(-34 44 60)"><rect x="18" y="49" width="52" height="22" rx="9" fill="url(#cn-barrel)" stroke="#0b1230" stroke-width="3.5"/><rect x="63" y="45" width="10" height="30" rx="4" fill="#ffd23f" stroke="#8c6a00" stroke-width="3"/><rect x="27" y="47" width="7" height="26" rx="3" fill="#ffd23f" stroke="#8c6a00" stroke-width="2.5"/><circle cx="14" cy="60" r="6.5" fill="#ffd23f" stroke="#8c6a00" stroke-width="2.5"/><rect x="36" y="53" width="24" height="5" rx="2.5" fill="#fff" opacity=".4"/></g><path d="M20 72L56 63L62 82L26 89Z" fill="#e8333b" stroke="#7a1420" stroke-width="3.5" stroke-linejoin="round"/><circle cx="44" cy="81" r="14" fill="#ffd23f" stroke="#8c6a00" stroke-width="3.5"/><path d="M44 69v24M32 81h24M35.5 72.5l17 17M52.5 72.5l-17 17" stroke="#8c6a00" stroke-width="2.5"/><circle cx="44" cy="81" r="4.5" fill="#e8333b" stroke="#7a1420" stroke-width="2"/></svg>`,
  tornado: `<svg viewBox="0 0 100 100"><defs><linearGradient id="tn-band" x1="0" x2="1"><stop offset="0" stop-color="#c9ccf5"/><stop offset=".45" stop-color="#ffffff"/><stop offset="1" stop-color="#aeb3ec"/></linearGradient></defs><g stroke-linecap="round" fill="none" stroke="#2f327a"><path d="M14 15H86" stroke-width="16"/><path d="M24 28H81" stroke-width="15"/><path d="M33 41H76" stroke-width="14"/><path d="M38 54H68" stroke-width="13"/><path d="M41 66H58" stroke-width="12"/><path d="M43 77H50" stroke-width="11"/><path d="M45 86H46" stroke-width="9"/></g><g stroke-linecap="round" fill="none" stroke="url(#tn-band)"><path d="M14 15H86" stroke-width="10"/><path d="M24 28H81" stroke-width="9"/><path d="M33 41H76" stroke-width="8"/><path d="M38 54H68" stroke-width="7"/><path d="M41 66H58" stroke-width="6.5"/><path d="M43 77H50" stroke-width="6"/><path d="M45 86H46" stroke-width="4"/></g><g stroke="#8c90d8" stroke-width="2.5" stroke-linecap="round"><path d="M30 17q14 3 30 -1"/><path d="M40 30q12 2 24 -1"/><path d="M46 43q8 2 18 -1"/></g><g stroke="#163a63" stroke-width="2"><rect x="80" y="44" width="10" height="10" rx="2" fill="#ff4d4d" transform="rotate(20 85 49)"/><rect x="9" y="47" width="9" height="9" rx="2" fill="#ffd23f" transform="rotate(-18 13 51)"/><rect x="74" y="70" width="8" height="8" rx="2" fill="#5fd35f" transform="rotate(35 78 74)"/><rect x="18" y="68" width="7" height="7" rx="1.5" fill="#2ec4f1" transform="rotate(-30 21 71)"/></g><ellipse cx="46" cy="93" rx="16" ry="4" fill="#fff" opacity=".7"/></svg>`,
  dynamite: `<svg viewBox="0 0 100 100"><defs><linearGradient id="dy-stick" x1="0" x2="1"><stop offset="0" stop-color="#ff8a8a"/><stop offset=".45" stop-color="#e8333b"/><stop offset="1" stop-color="#9e1620"/></linearGradient></defs><g transform="rotate(-12 50 62)"><rect x="20" y="36" width="19" height="56" rx="7" fill="url(#dy-stick)" stroke="#5c0a10" stroke-width="3.5"/><rect x="61" y="36" width="19" height="56" rx="7" fill="url(#dy-stick)" stroke="#5c0a10" stroke-width="3.5"/><rect x="40.5" y="31" width="19" height="61" rx="7" fill="url(#dy-stick)" stroke="#5c0a10" stroke-width="3.5"/><rect x="16" y="58" width="68" height="13" rx="3" fill="#2b2f45" stroke="#0d0f18" stroke-width="2.5"/><circle cx="50" cy="64.5" r="5" fill="#ff3b3b" stroke="#fff" stroke-width="2.5"/><path d="M50 31C49 19 59 14 66 9" stroke="#c98a4b" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M25 40v44M66 40v44" stroke="#fff" stroke-width="3" opacity=".35" stroke-linecap="round"/></g><path d="M66 5l3.5-9 2.5 9 9-3-7 7 8 6-10-1-1 10-4-9-9 4 6-8-8-5 10 0z" transform="translate(4 8) scale(.9)" fill="#ffe14d" stroke="#ff7b2e" stroke-width="1.5" stroke-linejoin="round"/></svg>`,
  plunger: `<svg viewBox="0 0 64 64"><rect x="29" y="12" width="6" height="22" fill="#d7dceb" stroke="#4f5568" stroke-width="2"/><rect x="14" y="7" width="36" height="9" rx="4.5" fill="#ff3b3b" stroke="#7a1420" stroke-width="3"/><rect x="8" y="31" width="48" height="26" rx="6" fill="#ffd23f" stroke="#8c6a00" stroke-width="3"/><rect x="11" y="34" width="42" height="6" rx="3" fill="#fff" opacity=".45"/><path d="M32 41l2.6 5.4 5.9.8-4.3 4.1 1 5.9-5.2-2.8-5.2 2.8 1-5.9-4.3-4.1 5.9-.8z" fill="#ff5a3c" stroke="#8c2a10" stroke-width="1.5" stroke-linejoin="round"/></svg>`,
  lighthouse: `<svg viewBox="0 0 64 64"><path d="M38 14L62 6V24Z" fill="#fff36b" opacity=".9"/><path d="M26 14L2 6V24Z" fill="#fff36b" opacity=".9"/><path d="M22 61L25 25H39L42 61Z" fill="#fff" stroke="#163a63" stroke-width="2" stroke-linejoin="round"/><path d="M24.3 34L24.9 27H39.1L39.7 34ZM23.5 43.5L24 37H40L40.5 43.5ZM22.7 53L23.2 46.5H40.8L41.3 53Z" fill="#ff4d4d"/><rect x="27" y="11" width="10" height="11" fill="#fff36b" stroke="#163a63" stroke-width="2"/><rect x="21" y="21" width="22" height="5" rx="1.5" fill="#2b2f45"/><path d="M24 12L32 3L40 12Z" fill="#d9363e" stroke="#163a63" stroke-width="2" stroke-linejoin="round"/><rect x="29" y="54" width="6" height="7" rx="3" fill="#8d5a2b"/></svg>`,
  snowman: `<svg viewBox="0 0 64 64"><path d="M22 31L9 23M42 31L55 21" stroke="#7a4a22" stroke-width="3.5" stroke-linecap="round"/><path d="M9 23L6 18M9 23L4 25M55 21L58 16M55 21L60 23" stroke="#7a4a22" stroke-width="2.5" stroke-linecap="round"/><circle cx="32" cy="48" r="13" fill="#fff" stroke="#8fb3dc" stroke-width="2.5"/><circle cx="32" cy="30" r="9.5" fill="#fff" stroke="#8fb3dc" stroke-width="2.5"/><circle cx="32" cy="16" r="7" fill="#fff" stroke="#8fb3dc" stroke-width="2.5"/><rect x="24" y="20.5" width="16" height="4.5" rx="2.2" fill="#ff4d4d"/><rect x="33" y="22" width="4" height="10" rx="2" fill="#ff4d4d"/><rect x="25" y="3" width="14" height="8" rx="1" fill="#2b2f45"/><rect x="21" y="10" width="22" height="3.5" rx="1.75" fill="#2b2f45"/><rect x="25" y="8" width="14" height="2.5" fill="#ff4d4d"/><circle cx="29.5" cy="15" r="1.6" fill="#2b2f45"/><circle cx="34.5" cy="15" r="1.6" fill="#2b2f45"/><path d="M32 17.5L40 19L32 20Z" fill="#ff8c1a"/><circle cx="32" cy="30" r="1.6" fill="#2b2f45"/><circle cx="32" cy="36" r="1.6" fill="#2b2f45"/><circle cx="32" cy="46" r="1.8" fill="#2b2f45"/></svg>`,
  rocket: `<svg viewBox="0 0 64 64"><path d="M26 50Q32 66 38 50Z" fill="#ff9f1c"/><path d="M29 50Q32 60 35 50Z" fill="#ffd23f"/><path d="M24 36L14 49V56L24 50ZM40 36L50 49V56L40 50Z" fill="#ff4d4d" stroke="#163a63" stroke-width="2" stroke-linejoin="round"/><path d="M24 51V24Q24 11 32 2Q40 11 40 24V51Z" fill="#fff" stroke="#163a63" stroke-width="2" stroke-linejoin="round"/><path d="M26 15Q28 8 32 3Q36 8 38 15Z" fill="#ff4d4d"/><rect x="24.5" y="40" width="15" height="4" fill="#2e9bf1"/><circle cx="32" cy="27" r="5" fill="#7fd6ff" stroke="#163a63" stroke-width="2"/><circle cx="30.5" cy="25.5" r="1.5" fill="#fff"/></svg>`,
  ferris: `<svg viewBox="0 0 64 64"><g stroke="#c7cfdb" stroke-width="2"><path d="M32 28L32 6M32 28L32 50M32 28L10 28M32 28L54 28M32 28L16.4 12.4M32 28L47.6 43.6M32 28L47.6 12.4M32 28L16.4 43.6"/></g><g fill="none" stroke-width="4"><circle cx="32" cy="28" r="22" stroke="#ff4d4d"/><circle cx="32" cy="28" r="22" stroke="#ffd23f" stroke-dasharray="23 115.2" stroke-dashoffset="-23"/><circle cx="32" cy="28" r="22" stroke="#5fd35f" stroke-dasharray="23 115.2" stroke-dashoffset="-46"/><circle cx="32" cy="28" r="22" stroke="#2ec4f1" stroke-dasharray="23 115.2" stroke-dashoffset="-69"/><circle cx="32" cy="28" r="22" stroke="#5b6cff" stroke-dasharray="23 115.2" stroke-dashoffset="-92"/><circle cx="32" cy="28" r="22" stroke="#b15cff" stroke-dasharray="23 115.2" stroke-dashoffset="-115"/></g><path d="M17 62L32 28L47 62" stroke="#5b6cff" stroke-width="4" fill="none" stroke-linejoin="round" stroke-linecap="round"/><g stroke="#163a63" stroke-width="1.5"><rect x="6" y="28" width="8" height="7" rx="2" fill="#ff9f1c"/><rect x="50" y="28" width="8" height="7" rx="2" fill="#2ec4f1"/><rect x="28" y="2" width="8" height="7" rx="2" fill="#b15cff"/><rect x="12" y="12" width="8" height="7" rx="2" fill="#5fd35f"/><rect x="44" y="12" width="8" height="7" rx="2" fill="#ff5fa2"/><rect x="12" y="44" width="8" height="7" rx="2" fill="#ffd23f"/><rect x="44" y="44" width="8" height="7" rx="2" fill="#ff4d4d"/></g><circle cx="32" cy="28" r="3.5" fill="#ffd23f" stroke="#8c6a00" stroke-width="1.5"/></svg>`,
  gun: `<svg viewBox="0 0 100 100"><defs><linearGradient id="mg-body" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffb26b"/><stop offset=".5" stop-color="#ff7b2e"/><stop offset="1" stop-color="#c94f0e"/></linearGradient><linearGradient id="mg-barrel" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".5" stop-color="#c7cfdb"/><stop offset="1" stop-color="#7d869c"/></linearGradient></defs><path d="M74 31L97 19M76 41L99 38M74 51L96 59" stroke="#ffe066" stroke-width="3.5" stroke-linecap="round"/><rect x="40" y="30" width="34" height="7" rx="3" fill="url(#mg-barrel)" stroke="#3a4058" stroke-width="2"/><rect x="40" y="38" width="34" height="7" rx="3" fill="url(#mg-barrel)" stroke="#3a4058" stroke-width="2"/><rect x="40" y="46" width="34" height="7" rx="3" fill="url(#mg-barrel)" stroke="#3a4058" stroke-width="2"/><rect x="63" y="26" width="7" height="31" rx="3" fill="#2ec4f1" stroke="#0b456b" stroke-width="2.5"/><path d="M80 41l4-8 2 8 9-2-7 6 7 6-9-2-2 8-4-8-8 3 5-6-5-6z" fill="#fff36b" stroke="#ff8a00" stroke-width="1.5" stroke-linejoin="round"/><rect x="30" y="56" width="10" height="20" rx="4" fill="#2b2f45" transform="rotate(-12 35 66)"/><rect x="10" y="26" width="34" height="32" rx="8" fill="url(#mg-body)" stroke="#7a2e05" stroke-width="3.5"/><rect x="16" y="31" width="20" height="5" rx="2.5" fill="#fff" opacity=".45"/><circle cx="22" cy="62" r="12" fill="#ffd23f" stroke="#8c6a00" stroke-width="3.5"/><circle cx="22" cy="62" r="4.5" fill="#e0a82e" stroke="#8c6a00" stroke-width="2"/><rect x="25" y="14" width="3.5" height="12" fill="#2b2f45"/><rect x="10" y="9" width="34" height="5.5" rx="2.75" fill="#ff5fa2" stroke="#9c1f5e" stroke-width="2"/><g fill="#e0a82e" stroke="#8c6a00" stroke-width="1.5"><rect x="54" y="68" width="5" height="10" rx="2" transform="rotate(30 56 73)"/><rect x="64" y="78" width="5" height="10" rx="2" transform="rotate(-25 66 83)"/><rect x="50" y="84" width="5" height="10" rx="2" transform="rotate(70 52 89)"/></g></svg>`,
  ufo: `<svg viewBox="0 0 100 100"><defs><linearGradient id="uf-beam" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9fffd8" stop-opacity=".95"/><stop offset="1" stop-color="#9fffd8" stop-opacity=".15"/></linearGradient><linearGradient id="uf-body" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".55" stop-color="#c7cfdb"/><stop offset="1" stop-color="#7d869c"/></linearGradient></defs><path d="M37 54H63L86 97H14Z" fill="url(#uf-beam)"/><g stroke="#163a63" stroke-width="2"><rect x="36" y="70" width="9" height="9" rx="2" fill="#ff4d4d" transform="rotate(20 40 74)"/><rect x="54" y="62" width="8" height="8" rx="2" fill="#ffd23f" transform="rotate(-15 58 66)"/><rect x="48" y="83" width="8" height="8" rx="2" fill="#2ec4f1" transform="rotate(35 52 87)"/></g><ellipse cx="50" cy="47" rx="41" ry="12" fill="url(#uf-body)" stroke="#3a4058" stroke-width="3.5"/><path d="M33 42a17 17 0 0 1 34 0z" fill="#bff3ff" stroke="#0b456b" stroke-width="3"/><path d="M44 22l-3-7M56 22l3-7" stroke="#3fb950" stroke-width="2.5" stroke-linecap="round"/><circle cx="41" cy="14" r="2.5" fill="#ffd23f"/><circle cx="59" cy="14" r="2.5" fill="#ffd23f"/><ellipse cx="50" cy="33" rx="8.5" ry="9" fill="#5fd35f" stroke="#2f8f3a" stroke-width="2"/><circle cx="46.5" cy="32" r="3" fill="#fff"/><circle cx="53.5" cy="32" r="3" fill="#fff"/><circle cx="47" cy="32.5" r="1.5" fill="#163a63"/><circle cx="54" cy="32.5" r="1.5" fill="#163a63"/><g stroke="#163a63" stroke-width="1.5"><circle cx="17" cy="48" r="3.5" fill="#ff4d4d"/><circle cx="30" cy="52" r="3.5" fill="#ffd23f"/><circle cx="44" cy="54" r="3.5" fill="#5fd35f"/><circle cx="56" cy="54" r="3.5" fill="#2ec4f1"/><circle cx="70" cy="52" r="3.5" fill="#b15cff"/><circle cx="83" cy="48" r="3.5" fill="#ff5fa2"/></g><ellipse cx="38" cy="42" rx="10" ry="3" fill="#fff" opacity=".7"/></svg>`,
  truck: `<svg viewBox="0 0 64 64"><path d="M8 20L44 9" stroke="#c7cfdb" stroke-width="6" stroke-linecap="round"/><path d="M10 19L44 9" stroke="#7d869c" stroke-width="2" stroke-dasharray="2.5 3"/><rect x="3" y="24" width="40" height="20" rx="3" fill="#ff4d4d" stroke="#7a1420" stroke-width="2.5"/><rect x="7" y="29" width="32" height="3.5" fill="#fff" opacity=".8"/><path d="M43 27H53L61 36V44H43Z" fill="#ff4d4d" stroke="#7a1420" stroke-width="2.5" stroke-linejoin="round"/><path d="M46 30H52L57 36H46Z" fill="#7fd6ff"/><rect x="45" y="21" width="8" height="5" rx="1.5" fill="#2e9bf1"/><circle cx="14" cy="47" r="7" fill="#2b2f45"/><circle cx="14" cy="47" r="3" fill="#c7cfdb"/><circle cx="50" cy="47" r="7" fill="#2b2f45"/><circle cx="50" cy="47" r="3" fill="#c7cfdb"/></svg>`,
  temple: `<svg viewBox="0 0 64 64"><g fill="#b9b096" stroke="#5c5444" stroke-width="2"><rect x="3" y="50" width="58" height="10"/><rect x="9" y="40" width="46" height="10"/><rect x="15" y="30" width="34" height="10"/><rect x="21" y="20" width="22" height="10"/></g><rect x="27" y="20" width="10" height="40" fill="#dcd3b8" stroke="#5c5444" stroke-width="1.5"/><path d="M27 25h10M27 30h10M27 35h10M27 40h10M27 45h10M27 50h10M27 55h10" stroke="#8d846a" stroke-width="1.2"/><rect x="24" y="8" width="16" height="12" fill="#cfc29c" stroke="#5c5444" stroke-width="2"/><rect x="29.5" y="12" width="5" height="8" fill="#3a3326"/><circle cx="32" cy="5" r="3" fill="#ffd23f" stroke="#8c6a00" stroke-width="1.2"/><path d="M3 50h12M49 40h6M15 30h6M43 20h6" stroke="#5fd35f" stroke-width="3"/><path d="M12 40v9M52 30v12M18 30v7" stroke="#2f9e44" stroke-width="2.5" stroke-linecap="round"/></svg>`,
  barn: `<svg viewBox="0 0 64 64"><path d="M6 30L14 14L32 6L50 14L58 30V60H6Z" fill="#d9363e" stroke="#7a1420" stroke-width="2.5" stroke-linejoin="round"/><path d="M4 30L14 13L32 5L50 13L60 30" fill="none" stroke="#fff" stroke-width="3" stroke-linejoin="round"/><rect x="21" y="37" width="22" height="23" fill="#fff"/><rect x="23.5" y="39.5" width="17" height="20.5" fill="#d9363e"/><path d="M23.5 39.5L40.5 60M40.5 39.5L23.5 60" stroke="#fff" stroke-width="2.5"/><rect x="27" y="17" width="10" height="10" fill="#fff"/><rect x="29" y="19" width="6" height="6" fill="#ffd23f"/></svg>`,
  toybox: `<svg viewBox="0 0 64 64"><rect x="30" y="8" width="4" height="48" rx="2" fill="#c98a4b"/><g stroke="#163a63" stroke-width="1.8"><rect x="9" y="49" width="46" height="9" rx="4.5" fill="#ff4d4d"/><rect x="13" y="41" width="38" height="8.5" rx="4.25" fill="#ff9f1c"/><rect x="17" y="33" width="30" height="8.5" rx="4.25" fill="#ffd23f"/><rect x="21" y="25" width="22" height="8.5" rx="4.25" fill="#5fd35f"/><rect x="25" y="17" width="14" height="8.5" rx="4.25" fill="#2ec4f1"/></g><circle cx="32" cy="10" r="6" fill="#b15cff" stroke="#163a63" stroke-width="1.8"/><circle cx="30" cy="8" r="1.8" fill="#fff" opacity=".7"/></svg>`,
  train: `<svg viewBox="0 0 64 64"><circle cx="15" cy="8" r="5" fill="#fff" stroke="#c7cfdb" stroke-width="1.5"/><circle cx="23" cy="5" r="3.5" fill="#fff" stroke="#c7cfdb" stroke-width="1.5"/><rect x="11" y="13" width="8" height="13" fill="#2b2f45"/><rect x="5" y="24" width="35" height="15" rx="6" fill="#2e9bf1" stroke="#0b456b" stroke-width="2.5"/><rect x="38" y="15" width="20" height="24" rx="2" fill="#ff4d4d" stroke="#7a1420" stroke-width="2.5"/><rect x="42" y="19" width="12" height="8" fill="#7fd6ff"/><rect x="35" y="11" width="27" height="5" rx="2" fill="#2b2f45"/><rect x="3" y="38" width="57" height="6" fill="#ffd23f" stroke="#8c6a00" stroke-width="2"/><g fill="#d9363e" stroke="#7a1420" stroke-width="2"><circle cx="14" cy="50" r="6.5"/><circle cx="31" cy="50" r="6.5"/><circle cx="49" cy="50" r="6.5"/></g><g fill="#fff"><circle cx="14" cy="50" r="2"/><circle cx="31" cy="50" r="2"/><circle cx="49" cy="50" r="2"/></g><path d="M1 59H63" stroke="#8d5a2b" stroke-width="3"/></svg>`,
  cake: `<svg viewBox="0 0 64 64"><g stroke-width="2"><rect x="6" y="44" width="52" height="16" rx="4" fill="#ff8cc0" stroke="#9c1f5e"/><rect x="12" y="31" width="40" height="14" rx="4" fill="#fff3d6" stroke="#9c7a3a"/><rect x="18" y="19" width="28" height="13" rx="4" fill="#b8e8ff" stroke="#0b456b"/></g><path d="M8 47q3 4 6 0t6 0 6 0 6 0 6 0 6 0 6 0 6 0" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/><g stroke="#163a63" stroke-width="1.2"><rect x="23" y="9" width="4" height="10" fill="#ff4d4d"/><rect x="30" y="7" width="4" height="12" fill="#ffd23f"/><rect x="37" y="9" width="4" height="10" fill="#5fd35f"/></g><g fill="#ff9f1c"><ellipse cx="25" cy="6" rx="2" ry="3"/><ellipse cx="32" cy="4" rx="2" ry="3"/><ellipse cx="39" cy="6" rx="2" ry="3"/></g><g fill="#5b6cff"><rect x="16" y="36" width="3" height="1.5" rx=".7"/><rect x="40" y="38" width="3" height="1.5" rx=".7"/><rect x="28" y="52" width="3" height="1.5" rx=".7"/></g><g fill="#5fd35f"><rect x="25" y="38" width="3" height="1.5" rx=".7"/><rect x="45" y="53" width="3" height="1.5" rx=".7"/><rect x="13" y="54" width="3" height="1.5" rx=".7"/></g></svg>`,
  rebuild: `<svg viewBox="0 0 64 64"><rect x="21" y="35" width="11" height="11" rx="2.5" fill="#ff4d4d"/><rect x="33" y="35" width="11" height="11" rx="2.5" fill="#2ec4f1"/><rect x="27" y="23" width="11" height="11" rx="2.5" fill="#ffd23f"/><path d="M51 33a19 19 0 1 1-6.5-14.3" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round"/><path d="M48 7l2 15-14-1z" fill="#fff"/></svg>`,
  soundOn: `<svg viewBox="0 0 64 64"><path d="M10 24h10l14-12v40L20 40H10z" fill="#fff"/><path d="M42 22c5 5 5 15 0 20M48 15c9 9 9 25 0 34" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round"/></svg>`,
  soundOff: `<svg viewBox="0 0 64 64"><path d="M10 24h10l14-12v40L20 40H10z" fill="#fff"/><path d="M42 24l14 16M56 24 42 40" stroke="#fff" stroke-width="5" stroke-linecap="round"/></svg>`,
  games: `<svg viewBox="0 0 40 40"><rect x="6" y="6" width="12" height="12" rx="3" fill="#ff5252"/><rect x="22" y="6" width="12" height="12" rx="3" fill="#ffd740"/><rect x="6" y="22" width="12" height="12" rx="3" fill="#40c4ff"/><rect x="22" y="22" width="12" height="12" rx="3" fill="#69f0ae"/></svg>`,
  tower: `<svg viewBox="0 0 64 64"><rect x="22" y="14" width="20" height="44" rx="3" fill="#2ec4f1"/><rect x="22" y="22" width="20" height="8" fill="#ffd23f"/><rect x="22" y="38" width="20" height="8" fill="#ff4d4d"/><rect x="20" y="8" width="6" height="8" fill="#5fd35f"/><rect x="29" y="8" width="6" height="8" fill="#b15cff"/><rect x="38" y="8" width="6" height="8" fill="#ff9f1c"/><path d="M32 8V0" stroke="#fff" stroke-width="2"/><path d="M33 0h9l-3 3 3 3h-9z" fill="#ff4d4d"/></svg>`,
  castle: `<svg viewBox="0 0 64 64"><rect x="8" y="22" width="12" height="36" fill="#ff8cc0"/><rect x="44" y="22" width="12" height="36" fill="#ff8cc0"/><rect x="18" y="32" width="28" height="26" fill="#ffd1e6"/><path d="M6 22 14 8l8 14zM42 22l8-14 8 14z" fill="#b15cff"/><rect x="27" y="44" width="10" height="14" rx="5" fill="#a0522d"/><path d="M18 32v-4h4v4h4v-4h4v4h4v-4h4v4h4v-4h4v4" fill="#ffd1e6"/></svg>`,
  city: `<svg viewBox="0 0 64 64"><rect x="4" y="26" width="16" height="34" fill="#ff9f1c"/><rect x="22" y="10" width="18" height="50" fill="#2ec4f1"/><rect x="42" y="20" width="18" height="40" fill="#5fd35f"/><g fill="#fff" opacity=".85"><rect x="8" y="32" width="4" height="4"/><rect x="14" y="32" width="3" height="4"/><rect x="26" y="16" width="4" height="5"/><rect x="33" y="16" width="4" height="5"/><rect x="26" y="26" width="4" height="5"/><rect x="33" y="26" width="4" height="5"/><rect x="46" y="26" width="4" height="4"/><rect x="53" y="26" width="4" height="4"/></g></svg>`,
  dominoes: `<svg viewBox="0 0 64 64"><g transform="rotate(-18 32 40)"><rect x="4" y="22" width="9" height="34" rx="2" fill="#ff4d4d"/><rect x="18" y="22" width="9" height="34" rx="2" fill="#ffd23f"/><rect x="32" y="22" width="9" height="34" rx="2" fill="#5fd35f"/><rect x="46" y="22" width="9" height="34" rx="2" fill="#2ec4f1"/></g></svg>`,
};

const TOOL_NAMES = { meteor: 'Meteor', ball: 'Wrecking ball', laser: 'Laser', bomb: 'Bomb', hammer: 'Hammer', cannon: 'Cannon', tornado: 'Tornado', dynamite: 'Dynamite', gun: 'Machine gun', ufo: 'UFO' };
const TOOL_COLORS = { meteor: '#7a4fb0', ball: '#ff4d4d', laser: '#2ec4f1', bomb: '#3a3f5c', hammer: '#ff5fa2', cannon: '#5fd35f', tornado: '#5b6cff', dynamite: '#ffb000', gun: '#5b6378', ufo: '#2ed3a0' };

function button(id, cls, html, label) {
  const b = document.createElement('button');
  b.id = id;
  b.className = `btn ${cls}`;
  b.innerHTML = html;
  b.setAttribute('aria-label', label);
  return b;
}

// Calls f on a quick press (not on a long hold); onHold(sec) fires once after `holdFor` seconds.
function press(el, f, { holdFor = 0, onHold = null } = {}) {
  let timer = null;
  let held = false;
  el.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    el.classList.add('on');
    held = false;
    if (onHold) {
      timer = setTimeout(() => {
        held = true;
        el.classList.remove('on');
        onHold();
      }, holdFor * 1000);
    }
  });
  const end = (e, run) => {
    e.preventDefault();
    el.classList.remove('on');
    clearTimeout(timer);
    if (run && !held) f();
  };
  el.addEventListener('pointerup', (e) => end(e, true));
  el.addEventListener('pointercancel', (e) => end(e, false));
  el.addEventListener('pointerleave', (e) => end(e, false));
}

export class UI {
  constructor(root, { tools, scenes, onTool, onRebuild, onSound, onPickScene, onGames, onGrownUp, onPlunger }) {
    this.root = root;
    const tl = document.createElement('div');
    tl.className = 'corner tl';
    const tr = document.createElement('div');
    tr.className = 'corner tr';
    const dock = document.createElement('div');
    dock.className = 'dock';
    root.append(tl, tr, dock);

    this.games = button('all-games', 'small', ICONS.games, 'All games');
    press(this.games, onGames);
    // The playground button shows where you are; tap it for a picture of every playground.
    this.sceneBtn = button('scene-btn', 'medium', ICONS.tower, 'Playgrounds');
    press(this.sceneBtn, () => this.togglePicker());
    tl.append(this.games, this.sceneBtn);
    this.picker = document.createElement('div');
    this.picker.className = 'picker';
    this.scenes = scenes.map((icon, i) => {
      const b = button(`scene-${i}`, 'scene', ICONS[icon] || ICONS.tower, `Playground ${i + 1}`);
      press(b, () => {
        this.closePicker();
        onPickScene(i);
      });
      this.picker.append(b);
      return b;
    });
    root.append(this.picker);

    this.sound = button('sound-btn', 'small', isMuted() ? ICONS.soundOff : ICONS.soundOn, 'Sound');
    // A quick tap toggles sound; holding it for 2 seconds opens the grown-up panel.
    press(this.sound, onSound, { holdFor: 2, onHold: onGrownUp });
    this.rebuild = button('rebuild-btn', 'big', ICONS.rebuild, 'Build it again');
    press(this.rebuild, onRebuild);
    tr.append(this.sound, this.rebuild);

    this.tools = {};
    for (const id of tools) {
      // Each tool: its picture on a big round button, and its name underneath (for grown-ups;
      // kids go by the pictures).
      const wrap = document.createElement('div');
      wrap.className = 'toolwrap';
      const b = button(`tool-${id}`, 'tool', ICONS[id], TOOL_NAMES[id] || id);
      b.style.setProperty('--tool', TOOL_COLORS[id] || '#888');
      press(b, () => onTool(id));
      const label = document.createElement('span');
      label.className = 'tlabel';
      label.textContent = TOOL_NAMES[id] || id;
      wrap.append(b, label);
      dock.append(wrap);
      this.tools[id] = wrap;
    }

    this.combo = document.createElement('div');
    this.combo.className = 'combo';
    this.combo.innerHTML = '<span class="star">★</span><span class="n">0</span>';
    root.append(this.combo);
    this.comboN = this.combo.querySelector('.n');

    // The dynamite plunger: pops up out of the dynamite button while there's dynamite waiting
    // to go off.
    this.plunger = button('plunger', 'plunger', ICONS.plunger, 'Set off the dynamite');
    press(this.plunger, onPlunger);
    (this.tools.dynamite || root).append(this.plunger);

    this.hand = document.createElement('div');
    this.hand.className = 'hand hidden';
    this.hand.innerHTML = '<div class="ripple"></div><div class="finger">👆</div>';
    root.append(this.hand);
  }

  setInApp(inApp) {
    this.games.classList.toggle('hidden', !inApp);
  }

  selectTool(id) {
    for (const [k, b] of Object.entries(this.tools)) b.classList.toggle('selected', k === id);
  }

  setSound(on) {
    this.sound.innerHTML = on ? ICONS.soundOn : ICONS.soundOff;
  }

  // The playground now showing: its picture on the button, and ringed in the picker.
  setScene(index, icon) {
    this.sceneBtn.innerHTML = ICONS[icon] || ICONS.tower;
    this.scenes.forEach((b, i) => b.classList.toggle('current', i === index));
  }

  get pickerOpen() {
    return this.picker.classList.contains('open');
  }
  togglePicker() {
    this.picker.classList.toggle('open');
    this.sceneBtn.classList.toggle('active', this.pickerOpen);
  }
  closePicker() {
    this.picker.classList.remove('open');
    this.sceneBtn.classList.remove('active');
  }

  showPlunger(on) {
    this.plunger.classList.toggle('show', on);
  }

  // The rebuild button bounces and glows once a lot is wrecked.
  wrecked(share) {
    this.rebuild.classList.toggle('pulse', share > 0.6);
  }

  // The combo bubble: shows while a burst of smashing is going on.
  showCombo(count, tier, live) {
    if (!live) {
      this.combo.classList.remove('show');
      return;
    }
    this.combo.classList.add('show');
    this.comboN.textContent = count;
    this.combo.dataset.tier = tier;
  }

  bumpCombo() {
    this.combo.classList.remove('bump');
    void this.combo.offsetWidth;
    this.combo.classList.add('bump');
  }

  // Shows the ghost hand tapping at screen point (x, y), or hides it.
  showHand(x, y) {
    if (x == null) {
      this.hand.classList.add('hidden');
      return;
    }
    this.hand.style.left = `${x}px`;
    this.hand.style.top = `${y}px`;
    this.hand.classList.remove('hidden');
  }
}
