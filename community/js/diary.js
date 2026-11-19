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
  party:     { name: 'a party popper' },
  treats:    { name: 'a bag of treats' },
  treat:     { name: 'a treat' },
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
  baby_night: ['{baby} woke {a} in the middle of the night. {a} got up without a word of complaint. Well, one word.', '{a} was up in the night with {baby}.', '{baby} cried at an unreasonable hour and {a} went.'],
  night_watch: ['{a} was up in the small hours, keeping an eye on things.', '{a} could not sleep and tidied the kitchen at three in the morning.', '{a} took the night shift. Somebody has to listen to the house creak.',
    'The light was on very late. It was {a}, pottering.'],
  hand_arrival: ['There is a new bao called {a}. {a} just sort of landed {room}.', '{a} turned up {room}, a bit dizzy. We have found a blanket.', 'We have a {a} now. Nobody saw {a} come in; {a} was simply {room}.',
    'A newcomer: {a}, found {room}, blinking. {a} seems nice.', '{a} arrived today, from above, more or less. {a} landed {room} and asked what was for supper.'],
  party: ['A party popper went off {room} all by itself, and that was it: a party. Everyone danced. {a} danced the longest.', 'There was a bang {room}, then confetti everywhere, then a party. Nobody planned it. Best kind.',
    'We had a party {room} today. {a} says it started on its own, which is how the good ones start.'],
  treats: ['A bag of treats burst open {room}. Sweets everywhere! {a} got there first.', 'It rained treats {room}, more or less. We collected every single one.', 'A paper bag popped {room} and sweets went all over the floor. Nobody complained.'],
  treats_gone: ['{a} found the very last treat and ate it slowly, so everyone could watch.', 'All the treats are gone. {a} checked under the sofa twice.'],
  photo_one: ['There was a bright flash {room} and {a} saw spots for a while. Afterwards, a little picture of {a} turned up on the wall.', 'A flash {room}! {a} blinked. There is a new photo on the wall now, and {a} looks lovely in it.'],
  photo_two: ['A flash went off {room}, right while {a} and {b} were there. There is a picture of the two of them on the wall now.', '{a} and {b} got their picture taken {room}. Nobody is sure by whom.'],
  photo_none: ['Something flashed {room}. Nobody was there. There is a picture of it on the wall now, which is a bit odd.'],
  photo_party: ['Somebody got a picture of the party. It is on the wall now. {a} is mid-twirl.', 'The party photo came out well. {a} has a streamer on one ear.'],
  welcome: ['{a} gave {b} a big welcome hug.', '{a} was the first to say hello to {b}.', '{a} showed {b} where the snacks are kept, which counts as a welcome here.'],
  teddy_give: ['{a} gave the teddy to {baby}. {baby} has not let go since.', '{a} found a teddy and took it straight to {baby}.'],
  choice_up: ['{a} pinned two ideas on the signboard: {w1}, or {w2}. There has been a lot of discussion.', 'Two drawings went up on the signboard: {w1} and {w2}. {a} keeps tapping one of them meaningfully.',
    'What next: {w1} or {w2}? {a} made a list of good points for both, which did not help.'],
  choice_user: ['Somebody circled {what} on the signboard. Nobody owns up to it, but that is decided, then. {a} cheered.', 'The vote is in: {what}. It is not clear who voted. {a} says it was the right call.'],
  choice_baos: ['Nobody could decide, so {a} picked {what}.', '{a} flipped a dumpling to decide, and it came down on {what}.'],
  baby_feed: ['{a} gave {baby} a bottle.', '{baby} drank a whole bottle and burped like a much bigger bao.'],
  laundry: ['{a} put a wash on.', '{a} did the laundry. One sock is missing, as usual.'],
  hang: ['{a} hung the washing out on the line.', 'Washing on the line. {a} pegged everything very neatly.'],
  rain_laundry: ['It rained on the washing. {a} says it counts as a second rinse.'],
  bath: ['{a} had a very long bath.', '{a} took a bubble bath and came out fluffy.', '{a} was in the bath for ages.'],
  chat: ['{a} and {b} talked for ages.', '{a} and {b} were whispering about something.', '{a} told {b} a long story. {b} listened to most of it.'],
  window: ['{a} watched out of the window for a long time.', '{a} stood at the window, thinking.'],
  window_rain: ['{a} watched the rain run down the window.'],
  stargaze: ['{a} went up to the roof to look at the stars.', '{a} counted stars on the roof and lost count twice.'],
  nap: ['{a} had a nap.', '{a} fell asleep sitting up.', '{a} napped for ages and woke up confused.'],
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
  scribble: ['Somebody drew on the wall in the {room}. {a} looks very innocent.', 'There is a new scribble on the wall in the {room}. {a} was seen nearby, humming.',
    'The wall in the {room} has been decorated. {a} says it was like that already.', 'More crayon in the {room}. I am not naming names. It was {a}.',
    'A small masterpiece appeared at bao height in the {room}. {a} has crayon on one cheek.'],
  tidy: ['{a} carried {thing} to the {room}, where it belongs.', '{a} put {thing} away in the {room}.'],
  duck: ['{a} took the rubber duck into the bath.'],
  teddy: ['{baby} will not let go of the teddy.'],
  fish: ['{a} fed the goldfish and told it about the day.', '{a} watched the goldfish go round.'],
  telescope: ['{a} looked through the telescope for a long time and said “hm” a lot.'],
  tea: ['{a} made tea.', '{a} and the teapot spent the afternoon together.'],
  piano: ['{a} played the piano. Three notes, over and over, but nice ones.'],
  greet: ['{a} went to say hello to {b}.'],
  build_haul: ['{a} worked on {what} all morning.', '{a} hammered away at {what}.', '{a} carried planks for {what}, one at a time.', '{a} put in a long shift on {what}.',
    '{a} measured {what} twice and still cut it wrong.', 'More progress on {what} today, mostly thanks to {a}.'],
  proj_start: ['We have started on {what}. {a} drew the plans on a napkin.', '{a} marked out the ground for {what}.', 'New project: {what}. {a} is in charge, according to {a}.',
    'There is string and little flags everywhere. {a} says it is going to be {what}.', 'Next we are making {what}. {a} has already lost the tape measure.'],
  repaint_start: ['{a} has decided the {room} needs repainting.'],
  repaint_done: ['The {room} is a new colour. {a} is very pleased with it.', '{a} finished repainting the {room}. It smells of paint and pride.'],
  floor_up: ['The new floor is up! Bare plaster so far: {r1}, {r2} and {r3} to come. We all stood on the roof and looked at it.',
    'We have another floor. It is only walls and dust for now, but there will be {r1}, {r2} and {r3}.'],
  floor_paint: ['{a} painted the new {room} and we carried the furniture in.', 'The new {room} is painted and furnished. {a} did the edges.', 'First coat, second coat, furniture: the {room} is ready. {a} has paint on everything.'],
  floor_power: ['The lights work on the new floor! {a} did the wiring and only got one small shock.', '{a} connected the electrics upstairs. We all flicked the switch on and off for a while.'],
  done_porch: ['The porch is finished. {a} sat on it straight away and would not get up.'],
  done_veg: ['The vegetable garden is dug and planted. {a} has named every row.'],
  done_patio: ['The patio is done, with a table and an umbrella. {a} says it is very continental.'],
  done_court: ['The basketball court is finished! {a} took the first shot and missed by a lot.'],
  done_bowling: ['We have a bowling alley. In the basement. {a} switched the sign on and everybody cheered.'],
  done_tennis: ['The tennis court is ready. {a} painted the lines, which are mostly straight.'],
  done_lake: ['The lake is full. It took for ever. {a} stood at the edge and said “well”.'],
  done_boat: ['There is a dock now, and a little boat. {a} has made a captain’s hat.'],
  tree_done: ['{a} planted a tree. It is small now but {a} has plans for it.', 'A new tree went in today. {a} watered it and gave it a talk.'],
  birdhouse_done: ['{a} hung a birdhouse in one of the trees. No birds yet. We are being patient.'],
  flowers_done: ['{a} put more flowers in the garden.'],
  garden: ['{a} worked in the garden.', '{a} weeded the beds and talked to the beans.', '{a} was out in the garden with the watering can.', '{a} dug over the vegetable patch.'],
  porch: ['{a} sat on the porch and watched the path.', '{a} spent the afternoon on the porch.'],
  patio: ['{a} had a drink out on the patio.', '{a} sat under the umbrella for a good while.'],
  hoops: ['{a} shot hoops for an hour and scored twice.', '{a} practised basketball. The hoop is very high for a bao.'],
  bowl: ['{a} went bowling in the basement and got a strike.', '{a} bowled three gutter balls and one perfect one.'],
  tennis: ['{a} played tennis, mostly against the net.', '{a} was on the tennis court for ages.'],
  fishing: ['{a} went fishing and caught nothing, happily.', '{a} sat by the lake with a rod all afternoon.'],
  fish_catch: ['{a} caught a fish! {a} looked at it, apologised, and put it back.'],
  boat: ['{a} took the boat out on the lake.', '{a} rowed round the lake twice.'],
  arrival: ['{a} moved in today, {from}.', 'We have a new neighbour: {a} arrived {from}.'],
  cart: ['The rubbish cart came and emptied the bins.'],
  moved: ['One moment {a} was {from}. The next, {a} was {room}. {a} would rather not talk about it.', '{a} ended up {room} somehow. Nobody saw how.',
    '{a} says the floor moved. {a} was {from}, and then {a} was {room}.', '{a} was {from}, blinked, and was {room}.', '{a} turned up {room}, a bit dizzy, with no idea how.',
    'There was a whoosh, and {a} went from being {from} to being {room}. We have agreed not to think about it.'],
  vapor: ['{a} is not anywhere. There was a little cloud of steam {room}. {a} will turn up, I expect.', 'I cannot find {a}. I have looked {room} twice. There was only some steam.',
    '{a} was {room} and then was not. There was a small cloud, the kind a kettle makes.', 'Has anyone seen {a}? There was a puff of steam {room} and that was that.',
    'Strange thing {room} today: some steam, and no {a}.', 'It smelled like a warm kitchen {room} for a moment, and when I looked there was no {a}.'],
  vapor_more: ['{a} as well now. A little steam {room}, and no {a}.', 'That makes {n} of us I cannot find. {a} was {room} a moment ago.', 'First {prev}, now {a}. Just a warm, damp patch {room}.',
    'I went to tell {a} about {prev}, and {a} was not there either. Only steam, {room}.', '{a} is gone too. I am keeping the notebook close.', 'Steam again, {room} this time. {a} is not answering.',
    'I counted us at supper. I counted again. We are short by {n}.', 'Nobody has seen {a} since the steam {room}. The house feels bigger than it did.',
    'I have started a list of who is not here. {a} is on it now, under {prev}.', 'Another puff {room}. Another empty spot where {a} was. I do not like the puffs.',
    '{a} went the same way as {prev}: all at once, and warmly.', 'We do not say the word steam any more. But there was some {room}, and now there is no {a}.'],
  vapor_last: ['{a} went {room}, in a puff. It is only me now. I will keep writing.', 'No {a} now either. I have the whole house and I do not want it.'],
  missing: ['Still no sign of {a}. I have left the light on.', 'I set a place for {a} at breakfast anyway.', 'Somebody asked where {a} was. Nobody knew. We changed the subject.',
    'The bed {a} sleeps in was still made this morning.', 'I looked for {a} again today, in the places I had already looked.', 'No {a}. I checked the roof, in case.'],
  drop: ['There was {thing} {room}. It was not there before.', '{thing_cap} turned up {room}.', 'Found {thing} {room} today.', 'New today: {thing}, {room}.',
    'Nobody remembers bringing {thing} into the house, but there it is, {room}.', '{a} found {thing} {room} and stared at it for some time.', 'There is {thing} {room} now. We walked round it twice.'],
  weather_snow: ['It snowed! Everything is white.'],
  weather_rain: ['Rain all over the garden.'],
  quiet: ['A quiet day. Everybody did their own thing.', 'Nothing much happened, in a nice way.'],
  first: ['I have decided to keep a diary. Things happen in this house and somebody should write them down.'],
  handover: ['This is {a}. I found the notebook on the shelf. I will keep it going.'],
};

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

export function entryText(S, type, d = {}) {
  const list = T[type] || ['…'];
  const usedLately = S.diary.filter((e) => e.k === type).slice(-Math.min(4, list.length - 1)).map((e) => e.i);
  const fresh = list.map((_, i) => i).filter((i) => !usedLately.includes(i));
  lastPick = fresh.length ? pick(fresh) : Math.floor(Math.random() * list.length);
  const tpl = list[lastPick];
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
    .replace(/^I and ([A-Z]\w+(?: [A-Z]\w+)?) /, '$1 and I ').replace(/of I\b/g, 'of me').replace(/was I\./g, 'was me.').replace(/woke I\b/g, 'woke me').replace(/told I\b/g, 'told me').replace(/and I were/g, 'and I were');
  return s;
}

let lastAt = 0, lastPick = 0;
const actorOf = (d) => (d.a ? (typeof d.a === 'string' ? d.a : d.a.name) : null);
// important: always recorded. Otherwise entries are spaced out so the diary stays short.
export function log(S, type, d = {}, opt = {}) {
  const t = opt.t ?? clock.t;
  if (!opt.important) {
    if (!chance(opt.p ?? 0.5)) return null;
    if (t - lastAt < (opt.gap ?? 2400) * 1000 && opt.t == null) return null;
    const today = dayKey(t);
    if (S.diary.filter((e) => e.d === today).length >= 12) return null;
    // no repeats: not the same kind of thing again soon, and not the same bao three times running
    const recent = S.diary.slice(-6);
    if (recent.some((e) => e.k === type) || S.diary.some((e) => e.k === type && Math.abs(t - e.t) < 4 * 3600000)) return null;
    const who = actorOf(d), last2 = S.diary.slice(-2);
    if (who && last2.length === 2 && last2.every((e) => e.a === who)) return null;
  }
  if (opt.t == null) lastAt = t;
  let text = entryText(S, type, d); const idx = lastPick;
  if (opt.theory && d.b) text += ' ' + entryText(S, '_', {}) .replace('…', '') + pick(THEORIES).replace('{b}', d.b.id === S.diarist ? 'I' : d.b.name)
    .replace(/^I says/, 'I say').replace(/^I thinks/, 'I think').replace(/^I is/, 'I am').replace(/^I blames/, 'I blame');
  const e = { t, d: dayKey(t), text: text.trim(), k: type, i: idx, a: actorOf(d) };
  S.diary.push(e);
  if (S.diary.length > 400) S.diary.splice(0, S.diary.length - 400);
  if (opt.t != null) S.diary.sort((a, b) => a.t - b.t);
  return e;
}
