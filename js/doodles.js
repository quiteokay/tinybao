// The little drawings in the diary's margin, one for every kind of entry, and the bigger ones
// that fill the space on a quiet day. All drawn as inline SVG in the notebook's ink.

const INK = '#5B4636';
const sv = (w, h, body, show = w) => `<svg class="dd" viewBox="0 0 ${w} ${h}" width="${show}" height="${Math.round(h * show / w)}" aria-hidden="true" fill="none" stroke="${INK}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;

const D = {
  bin: sv(30, 26, '<path d="M7 8 L23 8 L21 24 L9 24 Z" fill="#9FB3B8"/><path d="M5 6 L25 6"/><path d="M12 6 L12 3 L18 3 L18 6"/>'),
  broom: sv(28, 28, '<path d="M22 3 L12 15"/><path d="M8 13 L16 19 L11 25 C 7 25, 3 22, 3 19 Z" fill="#E7C46A"/><path d="M6 21 L9 18 M9 23 L12 20" stroke-width="1.5"/>'),
  dish: sv(32, 26, '<ellipse cx="16" cy="19" rx="12" ry="5" fill="#FFFFFF"/><ellipse cx="16" cy="14" rx="12" ry="5" fill="#DDEFF5"/><circle cx="25" cy="5" r="2.2" stroke-width="1.4"/><circle cx="29" cy="9" r="1.5" stroke-width="1.2"/>'),
  pot: sv(32, 28, '<path d="M5 12 H27 V22 C 27 25, 25 26, 22 26 H10 C 7 26, 5 25, 5 22 Z" fill="#E58C6A"/><path d="M3 12 H29"/><path d="M13 9 H19"/><path d="M11 6 C 12 4, 10 3, 11 1 M17 6 C 18 4, 16 3, 17 1 M23 6 C 24 4, 22 3, 23 1" stroke-width="1.4" opacity=".7"/>'),
  flame: sv(30, 30, '<path d="M15 3 C 17 9, 24 11, 23 19 C 22 25, 17 27, 15 27 C 10 27, 6 23, 7 17 C 8 13, 11 12, 11 8 C 13 10, 14 7, 15 3 Z" fill="#F4A13B"/><path d="M15 15 C 17 18, 18 20, 17 23 C 16 25, 13 25, 12 23 C 11 21, 13 19, 15 15 Z" fill="#F7D35C"/>'),
  rattle: sv(30, 30, '<circle cx="11" cy="10" r="7" fill="#F5B8C8"/><path d="M16 15 L24 23"/><circle cx="25.5" cy="24.5" r="2.6" fill="#F5B8C8"/><path d="M8 9 L8.1 9.1 M13 11 L13.1 11.1" stroke-width="2.4"/>'),
  teddy: sv(32, 26, '<circle cx="9" cy="6" r="4" fill="#C99A6B"/><circle cx="23" cy="6" r="4" fill="#C99A6B"/><circle cx="16" cy="14" r="10" fill="#C99A6B"/><circle cx="16" cy="17" r="3.5" fill="#E8CFAE"/><path d="M12.5 11.5 L12.6 11.6 M19.5 11.5 L19.6 11.6" stroke-width="3"/>'),
  newbao: sv(36, 30, '<path d="M5 26 C 3 17, 9 10, 15 9 C 16 6, 19 6, 20 9 C 27 10, 31 17, 29 26 Z" fill="#FFF3DC"/><path d="M14 19 L14.2 19 M21 19 L21.2 19" stroke-width="2.6"/><path d="M16 22 C 17 23, 19 23, 20 22"/><path d="M31 3 V9 M28 6 H34" stroke="#E0A92E"/><path d="M4 3 V7 M2 5 H6" stroke="#E0A92E" stroke-width="1.6"/>'),
  popper: sv(32, 30, '<path d="M5 27 L12 11 L21 20 Z" fill="#7FC3E8"/><path d="M15 9 L17 5 M20 13 L25 10 M22 18 L27 18" stroke="#E8604C"/><circle cx="25" cy="4" r="1.7" fill="#F2C14E" stroke="none"/><circle cx="29" cy="13" r="1.7" fill="#B07FD6" stroke="none"/><circle cx="9" cy="6" r="1.5" fill="#8CCB6A" stroke="none"/>'),
  sweets: sv(34, 30, '<path d="M10 15 L3 10 L4 20 Z M24 15 L31 10 L30 20 Z" fill="#F28FB0"/><ellipse cx="17" cy="15" rx="7.5" ry="6" fill="#F7B3C9"/><path d="M14 11 L19 19" stroke-width="1.4"/>'),
  camera: sv(40, 40, '<path d="M28 2 L30 8 L36 6 L32 11 L38 14 L31 15 L32 21 L28 16 L24 20 L25 14 L19 12 L25 10 Z" fill="#F3D36B"/><rect x="4" y="17" width="24" height="17" rx="3" fill="#E9E1D3"/><circle cx="16" cy="25.5" r="5"/><path d="M9 17 L11 14 L17 14 L19 17"/>', 34),
  signboard: sv(40, 44, '<rect x="6" y="4" width="28" height="26" rx="2" fill="#F1E3C6"/><path d="M12 36 L12 30 M28 36 L28 30"/><path d="M11 23 H29 M11 17 H29 M11 11 H29" stroke-width="1.6"/><ellipse cx="20" cy="9" rx="12" ry="5" stroke="#D9614C" stroke-width="2.2"/>', 32),
  shirt: sv(36, 30, '<path d="M2 5 C 12 9, 24 9, 34 5"/><path d="M11 8 L7 12 L10 15 L11 14 V27 H25 V14 L26 15 L29 12 L25 8 C 22 10, 14 10, 11 8 Z" fill="#9CC9E8"/><path d="M14 8 V5 M22 8 V5" stroke-width="1.6"/>'),
  duck: sv(34, 30, '<path d="M8 18 C 8 13, 12 11, 16 12 C 16 7, 20 5, 23 7 C 25 8, 25 10, 24 11 L28 12 L24 14 C 27 17, 26 24, 18 24 H12 C 9 24, 8 21, 8 18 Z" fill="#F7D35C"/><path d="M21.5 9 L21.6 9" stroke-width="2.6"/><path d="M3 28 C 8 26, 12 30, 17 28 S 26 26, 31 28" stroke="#7FB7D9"/>'),
  chat: sv(36, 28, '<path d="M3 4 H19 V14 H9 L5 18 V14 H3 Z" fill="#FFFFFF"/><path d="M15 11 H33 V21 H31 V25 L27 21 H15 Z" fill="#FDE3B5"/><path d="M7 9 H15 M19 16 H29" stroke-width="1.5"/>'),
  moon: sv(34, 30, '<path d="M17 4 C 10 5, 7 12, 9 18 C 11 24, 18 27, 24 24 C 17 23, 13 17, 15 11 C 16 8, 17 6, 17 4 Z" fill="#F7E08A"/><path d="M27 6 L28.5 9.5 L32 10 L29.5 12.5 L30 16 L27 14.3 L24 16 L24.5 12.5 L22 10 L25.5 9.5 Z" fill="#FFF3B0" stroke-width="1.5"/>'),
  zzz: sv(32, 24, '<path d="M4 12 H12 L4 21 H12"/><path d="M16 7 H22 L16 14 H22" stroke-width="1.8"/><path d="M25 2 H29 L25 7 H29" stroke-width="1.5"/>', 28),
  book: sv(34, 30, '<path d="M3 7 C 8 5, 13 6, 17 9 C 21 6, 26 5, 31 7 V25 C 26 23, 21 24, 17 27 C 13 24, 8 23, 3 25 Z" fill="#FFFFFF"/><path d="M17 9 V27"/><path d="M7 12 H13 M7 16 H13 M21 12 H27 M21 16 H27" stroke-width="1.4" stroke="#A9B8C4"/>'),
  boot: sv(34, 30, '<ellipse cx="17" cy="25" rx="14" ry="3.5" fill="#BFE0F2" stroke="#6FA6C8"/><path d="M11 4 H19 V16 L27 17 C 29 18, 29 22, 27 22 H11 Z" fill="#F2C14E"/><path d="M6 14 L4 11 M28 12 L31 9" stroke="#6FA6C8" stroke-width="1.6"/>'),
  snowbao: sv(34, 30, '<path d="M6 27 C 4 20, 9 15, 17 15 C 25 15, 30 20, 28 27 Z" fill="#FFFFFF"/><path d="M10 16 C 9 11, 13 6, 17 6 C 21 6, 25 11, 24 16" fill="#FFFFFF"/><path d="M14 11 L14.2 11 M20 11 L20.2 11" stroke-width="2.4"/><path d="M17 13 L22 14 L17 15" fill="#F4A13B" stroke-width="1.3"/>'),
  note: sv(30, 28, '<path d="M12 22 V6 L26 3 V19"/><ellipse cx="9" cy="22" rx="4" ry="3" fill="#3A2E2A"/><ellipse cx="23" cy="19" rx="4" ry="3" fill="#3A2E2A"/><path d="M12 10 L26 7"/>'),
  balloon: sv(30, 32, '<ellipse cx="15" cy="11" rx="8" ry="9.5" fill="#F28FB0"/><path d="M15 20.5 L13.5 23 H16.5 Z" fill="#F28FB0" stroke-width="1.3"/><path d="M15 23 C 12 26, 18 27, 15 31" stroke-width="1.3"/><path d="M11 7 C 12 5, 13 5, 15 4.6" stroke="#FFFFFF" stroke-width="1.6"/>', 26),
  sprout: sv(34, 30, '<path d="M5 27 H29" stroke="#8A6A4A"/><path d="M17 27 V13"/><path d="M17 15 C 12 15, 8 12, 8 7 C 13 7, 17 10, 17 15 Z" fill="#8CCB6A"/><path d="M17 13 C 21 12, 25 9, 26 4 C 21 4, 17 8, 17 13 Z" fill="#A8DA82"/>'),
  squiggle: sv(40, 26, '<path d="M3 18 C 7 6, 10 24, 14 13 S 21 4, 24 16 S 31 22, 36 9" stroke="#C4476B" stroke-width="2.2"/>', 36),
  brush: sv(30, 30, '<path d="M25 3 L14 16" stroke-width="3" stroke="#B98A5E"/><path d="M11 15 L15 19 C 13 24, 8 27, 3 27 C 3 22, 6 17, 11 15 Z" fill="#7FC3E8"/>'),
  plank: sv(40, 36, '<rect x="3" y="10" width="34" height="7" rx="1" fill="#D7A979" transform="rotate(-14 20 13)"/><path d="M10 23 L12 29 M18 24 L19 30" stroke-dasharray="1 4"/>', 34),
  house: sv(34, 30, '<path d="M5 15 L17 5 L29 15 V28 H5 Z" fill="#F1E3C6"/><path d="M14 28 V21 H20 V28"/><path d="M8 15 H26" stroke-dasharray="2 3"/><path d="M27 2 L28 4 M31 6 L33 5 M30 10 L32 11" stroke="#E0A92E" stroke-width="1.6"/>'),
  basketball: sv(36, 36, '<circle cx="18" cy="18" r="13" fill="#E9944A"/><path d="M5 18 H31 M18 5 V31"/><path d="M9 8 C 14 14, 14 22, 9 28 M27 8 C 22 14, 22 22, 27 28"/>', 28),
  bowling: sv(40, 44, '<path d="M14 4 C 10 4, 10 11, 12 14 C 8 19, 8 30, 10 40 L18 40 C 20 30, 20 19, 16 14 C 18 11, 18 4, 14 4 Z" fill="#FFFFFF"/><path d="M10.5 16 H17.5" stroke="#D9614C" stroke-width="2.4"/><circle cx="29" cy="34" r="7" fill="#5C7FB8"/><path d="M27 31.5 L27.1 31.6 M30.5 31 L30.6 31.1 M29 34 L29.1 34.1" stroke="#FFFFFF" stroke-width="2.4"/>', 30),
  racket: sv(32, 30, '<ellipse cx="13" cy="11" rx="8" ry="9" fill="#FFFFFF"/><path d="M8 7 H18 M7 11 H19 M8 15 H18 M10 3 V19 M13 2 V20 M16 3 V19" stroke-width="1" stroke="#A9B8C4"/><path d="M17 19 L25 27" stroke-width="3"/><circle cx="27" cy="9" r="4" fill="#D8F26B"/>'),
  fish: sv(34, 30, '<path d="M5 15 C 10 7, 20 7, 25 15 C 20 23, 10 23, 5 15 Z" fill="#F4A13B"/><path d="M25 15 L31 10 V20 Z" fill="#F4A13B"/><path d="M10 13 L10.2 13" stroke-width="2.6"/><path d="M14 11 C 16 13, 16 17, 14 19" stroke-width="1.4"/>'),
  boat: sv(34, 30, '<path d="M3 19 H31 L27 25 H7 Z" fill="#C98A5E"/><path d="M17 19 V3"/><path d="M17 4 L27 15 H17 Z" fill="#FFFFFF"/><path d="M2 28 C 6 26, 10 30, 14 28 S 22 26, 26 28 S 30 29, 33 28" stroke="#7FB7D9" stroke-width="1.6"/>'),
  rain: sv(34, 30, '<path d="M8 21 C 3 21, 2 14, 7 13 C 7 7, 15 5, 17 10 C 19 6, 27 7, 26 13 C 31 13, 31 21, 26 21 Z" fill="#E4EAF0"/><path d="M10 24 L9 28 M17 24 L16 28 M24 24 L23 28" stroke="#6FA6C8" stroke-width="1.6"/>'),
  snow: sv(30, 30, '<path d="M15 3 V27 M5 9 L25 21 M5 21 L25 9" stroke="#6FA6C8"/><path d="M12 5 L15 8 L18 5 M12 25 L15 22 L18 25" stroke="#6FA6C8" stroke-width="1.5"/>'),
  steam: sv(34, 30, '<path d="M9 26 C 5 21, 13 18, 9 13 C 6 9, 12 6, 10 2 M17 26 C 13 21, 21 18, 17 13 C 14 9, 20 6, 18 2 M25 26 C 21 21, 29 18, 25 13 C 22 9, 28 6, 26 2" stroke="#A9B8C4"/>'),
  teacup: sv(32, 30, '<path d="M5 11 H23 V18 C 23 23, 19 26, 14 26 C 9 26, 5 23, 5 18 Z" fill="#F5D0DC"/><path d="M23 13 C 28 13, 28 20, 23 20"/><path d="M11 3 C 12 5, 10 6, 11 8 M16 3 C 17 5, 15 6, 16 8" stroke-width="1.4" opacity=".7"/><path d="M3 28 H25"/>'),
  parcel: sv(34, 30, '<path d="M5 12 H29 V27 H5 Z" fill="#E9C99A"/><path d="M3 7 H31 V12 H3 Z" fill="#F2DDB5"/><path d="M17 7 V27"/><path d="M17 7 C 13 1, 8 4, 12 7 M17 7 C 21 1, 26 4, 22 7"/>'),
  heart: sv(32, 28, '<path d="M16 25 C 6 18, 3 13, 4 9 C 5 4, 12 3, 16 9 C 20 3, 27 4, 28 9 C 29 13, 26 18, 16 25 Z" fill="#F7A8B8"/>'),
  star: sv(32, 30, '<path d="M16 3 L19.5 11 L28 12 L21.5 17.5 L23.5 26 L16 21.5 L8.5 26 L10.5 17.5 L4 12 L12.5 11 Z" fill="#FFF3B0"/>'),
};

const KIND = {
  trash: 'bin', cart: 'bin', dishes: 'dish', sweep: 'broom', tidy: 'broom',
  cook: 'pot', spill: 'pot', snack_empty: 'pot', midnight_snack: 'pot', cake: 'pot',
  fire: 'flame', firewood: 'flame',
  baby_change: 'rattle', baby_sleep: 'rattle', baby_cry: 'rattle', baby_night: 'rattle', baby_feed: 'rattle',
  teddy_give: 'teddy', teddy: 'teddy',
  hand_arrival: 'newbao', arrival: 'newbao', welcome: 'heart', greet: 'heart',
  first: 'book', handover: 'book', read: 'book',
  party: 'popper', photo_party: 'popper', treats: 'sweets', treats_gone: 'sweets',
  photo_one: 'camera', photo_two: 'camera', photo_none: 'camera', photos: 'camera',
  choice_up: 'signboard', choice_user: 'signboard', choice_baos: 'signboard',
  laundry: 'shirt', hang: 'shirt', rain_laundry: 'shirt',
  bath: 'duck', duck: 'duck', chat: 'chat', tea: 'teacup', porch: 'teacup', patio: 'teacup',
  window: 'moon', stargaze: 'moon', telescope: 'moon', window_rain: 'rain',
  nap: 'zzz', night_watch: 'zzz', quiet: 'zzz',
  splash: 'boot', snowbao: 'snowbao',
  dance: 'note', drum: 'note', drum_wake: 'note', piano: 'note', tv: 'star', mirror: 'star',
  balloon_pop: 'balloon', box: 'parcel', drop: 'parcel',
  water: 'sprout', plant_seeds: 'sprout', bloom: 'sprout', garden: 'sprout', tree_done: 'sprout', birdhouse_done: 'sprout', flowers_done: 'sprout', done_veg: 'sprout',
  scribble: 'squiggle', drawing: 'brush', paint: 'brush', repaint_start: 'brush', repaint_done: 'brush', floor_paint: 'brush',
  build_haul: 'plank', proj_start: 'plank',
  floor_up: 'house', floor_power: 'house', done_porch: 'house', done_patio: 'house', moved: 'house',
  done_court: 'basketball', hoops: 'basketball', hoops_call: 'basketball', hoops_rain: 'basketball', hoops_snow: 'basketball', hoops_night: 'basketball',
  done_bowling: 'bowling', bowl: 'bowling', done_tennis: 'racket', tennis: 'racket',
  done_lake: 'fish', fishing: 'fish', fish_catch: 'fish', fish: 'fish', done_boat: 'boat', boat: 'boat',
  weather_rain: 'rain', weather_snow: 'snow',
  vapor: 'steam', vapor_more: 'steam', vapor_last: 'steam', missing: 'steam',
};
export const doodleName = (kind) => KIND[kind] || 'star';
export const doodleFor = (kind) => D[doodleName(kind)];
export const KNOWN_KINDS = KIND;

// ---------- the bigger drawings for a quiet day ----------
const big = (w, h, body, label) => `<svg class="big" viewBox="0 0 ${w} ${h}" role="img" aria-label="${label}" fill="none" stroke="${INK}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
const hand = (x, y, s, t, col = '#8A6A58', extra = '') => `<text x="${x}" y="${y}" fill="${col}" stroke="none" font-family="'Patrick Hand', cursive" font-size="${s}" ${extra}>${t}</text>`;
const BIG = {
  napkin: big(230, 175, '<g transform="rotate(4 115 88)"><rect x="18" y="10" width="178" height="150" rx="3" fill="#FFFFFF" stroke="#BFB3A6" stroke-width="1.5"/><rect x="28" y="20" width="158" height="130" rx="2" stroke="#E4DBD0" stroke-width="1.5" stroke-dasharray="2 4"/>'
    + '<circle cx="160" cy="122" r="18" stroke="#D9B48C" stroke-width="3" opacity="0.6"/><path d="M68 132 H146 V64 H68 Z" stroke="#4A6FA5"/><path d="M68 98 H146 M106 98 V132" stroke="#4A6FA5"/><path d="M64 64 L107 34 L150 64" stroke="#4A6FA5" stroke-dasharray="4 4"/>'
    + hand(78, 56, 14, 'new!!', '#D9614C') + '<path d="M160 44 C 170 50, 170 60, 152 62" stroke="#D9614C" stroke-width="1.8"/><path d="M156 58 L151 62 L157 65" stroke="#D9614C" stroke-width="1.8"/>'
    + '<rect x="6" y="2" width="44" height="16" fill="#F1E6B8" opacity="0.85" stroke="none" transform="rotate(-24 28 10)"/><rect x="166" y="146" width="44" height="16" fill="#F1E6B8" opacity="0.85" stroke="none" transform="rotate(-24 188 154)"/></g>', 'the plans, drawn on a napkin and taped in'),
  shot: big(280, 70, '<circle cx="14" cy="58" r="7" fill="#E9944A"/><path d="M22 52 C 70 12, 150 10, 262 38" stroke-dasharray="3 6"/><path d="M256 32 L263 38 L254 41"/><path d="M150 64 H184" stroke-width="2.4"/><path d="M152 64 L156 70 M160 64 L162 70 M170 64 L170 70 M180 64 L176 70" stroke-width="1.4"/><path d="M184 64 V48 H192" stroke-width="2.4"/>' + hand(84, 68, 14, '(hoop is here)'), 'a basketball shot sailing right past the hoop'),
  bunting: big(280, 80, '<path d="M4 10 C 90 40, 190 40, 276 10"/>' + [0, 1, 2, 3, 4, 5, 6].map((i) => { const x = 22 + i * 36, y = 10 + Math.sin((x - 4) / 272 * Math.PI) * 22; return `<path d="M${x - 10} ${y} L${x + 10} ${y + 1} L${x} ${y + 22} Z" fill="${['#F28FB0', '#F7D35C', '#7FC3E8', '#8CCB6A', '#B07FD6', '#F4A13B', '#F28FB0'][i]}"/>`; }).join('') + hand(104, 74, 18, 'party!!', '#D9614C'), 'party bunting'),
  arrival: big(220, 120, '<path d="M60 112 C 52 80, 70 56, 92 52 C 95 42, 105 42, 108 52 C 130 56, 148 80, 140 112 Z" fill="#FFF3DC"/><path d="M88 84 L88.4 84 M112 84 L112.4 84" stroke-width="4"/><path d="M95 93 C 98 97, 102 97, 105 93"/><circle cx="80" cy="92" r="4" fill="#F2A7A7" stroke="none"/><circle cx="120" cy="92" r="4" fill="#F2A7A7" stroke="none"/>'
    + '<path d="M40 30 V46 M32 38 H48 M168 22 V34 M162 28 H174 M176 70 V78 M172 74 H180" stroke="#E0A92E"/><path d="M100 4 C 104 20, 96 30, 100 44" stroke-dasharray="2 5"/>' + hand(150, 112, 18, 'hello!', '#D9614C'), 'a new bao, just landed'),
  snowbao: big(200, 130, '<path d="M60 124 C 54 96, 72 82, 100 82 C 128 82, 146 96, 140 124 Z" fill="#FFFFFF"/><path d="M74 84 C 70 60, 84 42, 100 42 C 116 42, 130 60, 126 84" fill="#FFFFFF"/><path d="M90 62 L90.4 62 M110 62 L110.4 62" stroke-width="4"/><path d="M100 68 L116 72 L100 76" fill="#F4A13B"/><path d="M80 84 C 92 90, 108 90, 120 84" stroke="#D9614C" stroke-width="5"/><path d="M76 100 L56 86 M124 100 L146 84" stroke="#8A6A4A"/>'
    + [[30, 20], [160, 30], [40, 70], [170, 80], [20, 110], [180, 120], [130, 14]].map(([x, y]) => `<path d="M${x} ${y - 4} V${y + 4} M${x - 4} ${y} H${x + 4}" stroke="#9CC3E6" stroke-width="1.6"/>`).join(''), 'a snowbao'),
  raincloud: big(220, 110, '<path d="M50 62 C 30 62, 28 38, 48 36 C 48 16, 78 8, 88 26 C 96 10, 130 12, 128 34 C 150 32, 152 62, 132 62 Z" fill="#E4EAF0"/>' + [[56, 74], [76, 82], [96, 74], [116, 82], [66, 96], [106, 96]].map(([x, y]) => `<path d="M${x} ${y} L${x - 3} ${y + 9}" stroke="#6FA6C8"/>`).join('') + hand(150, 96, 18, 'drip drip'), 'a rain cloud'),
  quiet: big(220, 100, '<path d="M50 92 C 46 70, 60 56, 78 54 C 80 46, 88 46, 90 54 C 108 56, 120 70, 116 92 Z" fill="#FFF3DC"/><path d="M70 76 C 73 79, 77 79, 80 76 M88 76 C 91 79, 95 79, 98 76"/><path d="M80 84 C 82 86, 86 86, 88 84"/>'
    + '<path d="M128 40 H140 L128 54 H140 M148 26 H156 L148 36 H156 M162 14 H168 L162 22 H168" stroke-width="2.4"/>' + hand(130, 88, 18, 'a quiet day'), 'a sleepy bao: a quiet day'),
};
// The day's most notable kind of entry picks the drawing.
const PICK = [
  [['proj_start', 'floor_up'], 'napkin'], [['done_court', 'hoops', 'hoops_call', 'hoops_rain', 'hoops_snow', 'hoops_night'], 'shot'],
  [['party', 'photo_party'], 'bunting'], [['hand_arrival', 'arrival', 'welcome'], 'arrival'], [['snowbao', 'weather_snow'], 'snowbao'],
  [['weather_rain', 'rain_laundry', 'window_rain', 'splash'], 'raincloud'],
];
export function bigDoodle(kinds) {
  for (const [ks, name] of PICK) if (kinds.some((k) => ks.includes(k))) return { name, svg: BIG[name] };
  return { name: 'quiet', svg: BIG.quiet };
}
