// The diary: one bao keeps a notebook. Events in the world become short entries.
import { clock, pick, chance, dayKey } from './core.js';

export const THINGS = {
  ball:      { name: 'a ball', home: ['playroom', 'spare'] },
  plant:     { name: 'a pot plant' },
  snacks:    { name: 'a bag of snacks', uses: 5 },
  drum:      { name: 'a drum', home: ['music', 'spare'] },
  tv:        { name: 'a television', home: ['living'] },
  rug:       { name: 'a rug' },
  lamp:      { name: 'a lamp' },
  duck:      { name: 'a rubber duck', home: ['bathroom'] },
  wood:      { name: 'a bundle of firewood' },
  books:     { name: 'a stack of books', home: ['library'] },
  radio:     { name: 'a radio' },
  balloon:   { name: 'a balloon', uses: 4 },
  box:       { name: 'a cardboard box' },
  teddy:     { name: 'a teddy', home: ['nursery'] },
  cake:      { name: 'a cake' },
  mirror:    { name: 'a mirror' },
  fish:      { name: 'a goldfish in a bowl' },
  telescope: { name: 'a telescope', home: ['roof'] },
  seeds:     { name: 'a packet of seeds' },
  paint:     { name: 'a pot of paint' },
};

const THEORIES = [
  '{b} says it fell off a bird.',
  '{b} thinks it grew there overnight.',
  '{b} says the wind brought it.',
  '{b} is sure it was always there and nobody noticed.',
  '{b} thinks it came up through the floorboards.',
  '{b} says the postbao must have left it.',
  '{b} thinks somebody ordered it and forgot.',
  '{b} says things just turn up sometimes and that is that.',
  '{b} blames the weather.',
  '{b} says it rolled in from next door. There is no next door.',
  '{b} thinks the house made it.',
  'Nobody has a good explanation. {b} has three bad ones.',
];

const T = {
  trash: ['{a} took the rubbish out without being asked. Suspicious.', '{a} took the rubbish out.', '{a} wrestled the rubbish bag all the way to the bins.'],
  dishes: ['{a} washed every dish in the sink.', '{a} did the washing up and made a tower of bubbles.', 'The dishes were piling up. {a} dealt with it.'],
  sweep: ['{a} swept up crumbs. Nobody admitted to the crumbs.', '{a} tidied the floor.', '{a} found a mess and swept it away.'],
  cook: ['{a} made a big pot of soup.', '{a} cooked. The whole house smelled wonderful.', '{a} made dumpling soup, which felt a bit odd, but it was delicious.'],
  spill: ['{a} spilled the soup. There is a stain on the kitchen floor now. We are calling it the Great Soup Spill.'],
  fire: ['{a} lit the fire and everyone drifted towards it.', '{a} got the fire going.', 'Fire lit. {a} is very proud.'],
  firewood: ['{a} carried in firewood.', '{a} brought logs in from the woodpile, one at a time.'],
  baby_change: ['{a} changed {baby}. {baby} did not help.', '{a} changed {baby}’s nappy. A brave bao.', '{baby} needed changing. {a} stepped up.'],
  baby_sleep: ['{a} tucked {baby} into the crib.', '{a} carried {baby} to bed. {baby} was asleep before the blanket.'],
  baby_cry: ['{baby} cried for a while. We all pretended not to hear, then all went at once.', '{baby} was very loud today.'],
  baby_feed: ['{a} gave {baby} a bottle.', '{baby} drank a whole bottle and burped like a much bigger bao.'],
  laundry: ['{a} put a wash on.', '{a} did the laundry. One sock is missing, as usual.'],
  hang: ['{a} hung the washing out on the line.', 'Washing on the line. {a} pegged everything very neatly.'],
  rain_laundry: ['It rained on the washing. {a} says it counts as a second rinse.'],
  bath: ['{a} had a very long bath.', '{a} took a bubble bath and came out fluffy.', '{a} was in the bath for ages.'],
  chat: ['{a} and {b} talked for ages.', '{a} and {b} were whispering about something.', '{a} told {b} a long story. {b} listened to most of it.'],
  window: ['{a} watched out of the window for a long time.', '{a} stood at the window, thinking.'],
  window_rain: ['{a} watched the rain run down the window.'],
  stargaze: ['{a} went up to the roof to look at the stars.', '{a} counted stars on the roof and lost count twice.'],
  nap: ['{a} had a nap.', '{a} fell asleep sitting up.', '{a} napped right through the afternoon.'],
  read: ['{a} read a whole book.', '{a} was reading and would not be interrupted.'],
  midnight_snack: ['Somebody was in the fridge at midnight. It was {a}.', '{a} had a midnight snack and left the fridge door open.'],
  splash: ['{a} jumped in every puddle in the garden and then needed a bath.'],
  snowbao: ['{a} built a snowbao in the garden. It looks a lot like {a}.', 'There is a snowbao outside now. {a} made it.'],
  box: ['{a} sat in the box for a long time. It is {a}’s box now.', '{a} got in the box and would not come out.'],
  mirror: ['{a} spent a while looking in the mirror.'],
  tv: ['{a} watched television. It was mostly weather.'],
  dance: ['{a} danced to the radio.', 'The radio was on and {a} could not stop dancing.'],
  drum: ['{a} played the drum. Loudly. For a long time.', '{a} has discovered rhythm. We are all very tired.'],
  drum_wake: ['{a} played the drum while {b} was asleep. There were opinions about it.'],
  balloon_pop: ['The balloon popped. {a} jumped a full bao-height in the air.'],
  snack_empty: ['The snacks are all gone. {a} had the last one.'],
  cake: ['There was cake. Everyone came. Nobody knows why there was cake, and nobody asked twice.'],
  water: ['{a} watered the plants.', '{a} gave the plant a drink and a little talk.'],
  plant_seeds: ['{a} planted seeds in the garden.'],
  bloom: ['The flowers in the garden came up. {a} noticed first.'],
  paint: ['{a} painted the {room}. Nobody asked {a} to.', '{a} repainted the {room}. It is very bright now.'],
  drawing: ['{a} made a picture and hung it in the {room}.', '{a} painted something. We put it on the wall.'],
  scribble: ['Somebody drew on the wall in the {room}. {a} looks very innocent.'],
  tidy: ['{a} carried {thing} to the {room}, where it belongs.', '{a} put {thing} away in the {room}.'],
  duck: ['{a} took the rubber duck into the bath.'],
  teddy: ['{baby} will not let go of the teddy.'],
  fish: ['{a} fed the goldfish and told it about the day.', '{a} watched the goldfish go round.'],
  telescope: ['{a} looked through the telescope for a long time and said “hm” a lot.'],
  tea: ['{a} made tea.', '{a} and the teapot spent the afternoon together.'],
  piano: ['{a} played the piano. Three notes, over and over, but nice ones.'],
  greet: ['{a} went to say hello to {b}.'],
  build_start: ['It is getting crowded. A pile of planks appeared in the garden and {a} says we are building another floor.'],
  build_haul: ['{a} carried planks up to the roof.', '{a} hammered things on the roof all morning.'],
  build_done: ['The new floor is finished! There is {r1}, {r2} and {r3}. We all stood on the roof and looked at it.'],
  arrival: ['{a} moved in today, {from}.', 'We have a new neighbour: {a} arrived {from}.'],
  cart: ['The rubbish cart came and emptied the bins.'],
  moved: ['One moment {a} was {from}. The next, {a} was {room}. {a} would rather not talk about it.', '{a} ended up {room} somehow. Nobody saw how.', '{a} says the floor moved. {a} was {from}, and then {a} was {room}.'],
  vapor: ['{a} is not anywhere. There was a little cloud of steam {room}. {a} will turn up, I expect.', 'I cannot find {a}. I have looked {room} twice. There was only some steam.'],
  missing: ['Still no sign of {a}. I have left the light on.'],
  drop: ['There was {thing} {room}. It was not there before.', '{thing_cap} turned up {room}.', 'Found {thing} {room} today.'],
  weather_snow: ['It snowed! Everything is white.'],
  weather_rain: ['Rain all over the garden.'],
  quiet: ['A quiet day. Everybody did their own thing.', 'Nothing much happened, in a nice way.'],
  first: ['I have decided to keep a diary. Things happen in this house and somebody should write them down.'],
  handover: ['This is {a}. I found the notebook on the shelf. I will keep it going.'],
};

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

export function entryText(S, type, d = {}) {
  const tpl = pick(T[type] || ['…']);
  const me = S.diarist;
  const nm = (b) => (!b ? 'somebody' : typeof b === 'string' ? b : b.id === me ? 'I' : b.name);
  const baby = S.baos.find((b) => b.kind === 'baby');
  let s = tpl.replace(/\{(\w+)\}/g, (_, k) => {
    if (k === 'a' || k === 'b') return nm(d[k]);
    if (k === 'baby') return baby ? baby.name : 'the baby';
    if (k === 'thing_cap') return cap(d.thing || 'something');
    return d[k] ?? '';
  });
  // tidy up first-person grammar
  s = s.replace(/\bI’s\b/g, 'my').replace(/\bI is\b/g, 'I am').replace(/\bI has\b/g, 'I have').replace(/\bI says\b/g, 'I say')
    .replace(/\bI thinks\b/g, 'I think').replace(/\bI blames\b/g, 'I blame').replace(/\bI looks\b/g, 'I look')
    .replace(/like I\b/g, 'like me').replace(/asked I\b/g, 'asked me').replace(/find I\b/g, 'find me').replace(/expect I will/g, 'expect I will')
    .replace(/of I\b/g, 'of me').replace(/was I\./g, 'was me.').replace(/woke I\b/g, 'woke me').replace(/told I\b/g, 'told me').replace(/and I were/g, 'and I were');
  return s;
}

let lastAt = 0;
// important: always recorded. Otherwise entries are spaced out so the diary stays short.
export function log(S, type, d = {}, opt = {}) {
  const t = opt.t ?? clock.t;
  if (!opt.important) {
    if (!chance(opt.p ?? 0.5)) return null;
    if (t - lastAt < (opt.gap ?? 600) * 1000 && opt.t == null) return null;
    const today = dayKey(t);
    if (S.diary.filter((e) => e.d === today).length >= 12) return null;
  }
  if (opt.t == null) lastAt = t;
  let text = entryText(S, type, d);
  if (opt.theory && d.b) text += ' ' + entryText(S, '_', {}) .replace('…', '') + pick(THEORIES).replace('{b}', d.b.id === S.diarist ? 'I' : d.b.name)
    .replace(/^I says/, 'I say').replace(/^I thinks/, 'I think').replace(/^I is/, 'I am').replace(/^I blames/, 'I blame');
  const e = { t, d: dayKey(t), text: text.trim(), k: type };
  S.diary.push(e);
  if (S.diary.length > 400) S.diary.splice(0, S.diary.length - 400);
  if (opt.t != null) S.diary.sort((a, b) => a.t - b.t);
  return e;
}
