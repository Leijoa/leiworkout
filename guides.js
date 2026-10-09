// Original diagrams are movement cues, not anatomical or personalised coaching.
const image = (file, caption) => ({src:`./media/${file}`,alt:caption,caption});
const video = (id, creator='Exercises.com.au') => ({id,creator,url:`https://www.youtube.com/watch?v=${id}`});
const guide = (title, images, how, caution, film) => ({title,images,how,caution,video:film});
export const movementGuides = {
  march:guide('原地踏步', [image('march.svg','示意圖：左右交替抬腳，手臂自然擺動')], ['站穩，雙腳約與髖同寬，肩膀放鬆。','左右交替抬腳再放下，配合自然擺臂；至少一腳始終踩地。','從慢速開始。暖身逐漸加快，收操則放慢到呼吸平穩。'], '不必把膝蓋抬很高，也不需要跳。'),
  mobility:guide('腳踝與肩膀活動', [image('mobility.svg','示意圖：腳踝畫圈、肩膀向後繞圈')], ['坐穩或扶住固定支撐，抬起一腳，腳踝慢慢畫小圈。','換另一腳，兩邊都做；正反方向慢慢轉。','站穩或坐穩，雙肩向上、向後、向下繞小圈。'], '幅度保持舒服，不甩動、不硬拉。',video('8wiUHZ-Uyuo')),
  catcow:guide('貓牛式', [image('cow.jpg','貓式：吐氣，背部向上拱，頭自然放低'),image('cat.jpg','牛式：吸氣，胸口向前，背部輕微下沉')], ['四足跪姿：手掌在肩膀下方，膝蓋在髖部下方。','吐氣時腹部輕收、背部慢慢拱起，頭自然放低（貓式）。','吸氣時胸口向前、背部輕微下沉（牛式），兩種姿勢慢慢交替。'], '不猛抬頭、不把腰壓到極限；用舒服的小幅度即可。',video('kqnua4rHVVA','Howcast')),
  deadbug:guide('死蟲式（Dead Bug）', [image('dead-bug.svg','示意圖：仰躺起始 → 對側手腳慢慢伸出')], ['仰躺，雙手朝天，髖與膝彎約 90 度，下背保持貼墊。','吐氣，把右手往頭頂方向、左腿往前慢慢伸出；腰不離地。','回到起始，再換左手與右腿。每側各一次算左右各 1 下。'], '若腰開始拱起，縮短手腳伸出的距離。',video('p3vu2x9Z5wA')),
  reverse:guide('反向捲腹', [image('reverse-crunch.svg','示意圖：屈膝仰躺 → 骨盆輕輕捲起')], ['仰躺，雙手放身旁，屈髖屈膝，雙腳離地。','吐氣收腹，讓骨盆往胸口捲，尾骨稍微離墊。','慢慢把骨盆放回墊上，保持屈膝，再重複。'], '不是把腿甩過頭；捲起幅度小也可以。',video('_Z8Sm5e5rlg')),
  heel:guide('側腹碰腳跟（Heel Touch）', [image('heel-touch.svg','示意圖：雙腳踩地，左右手輪流碰同側腳跟')], ['仰躺屈膝，雙腳平放地面，腳跟靠近臀部，手放身旁。','肩胛微微離墊，右手沿地面方向碰右腳跟。','回中間，再左手碰左腳跟。左右輪流，腳掌始終踩地。'], '這裡是手碰腳跟，不是抬腿讓腳跟點地。脖子放鬆，不用手拉頭。',video('fLajmFLpJ_w')),
  plank:guide('前臂平板撐', [image('plank.png','前臂與腳尖支撐，頭、軀幹、腿保持一直線')], ['前臂放墊上，手肘約在肩膀下方，腳尖踩地。','收腹，抬起身體，頭到腳跟大致成一直線。','保持自然呼吸，穩穩撐住；撐不住時先放下膝蓋休息。'], '不要塌腰或把臀部抬很高。',video('CA6Hc-Ex6q4')),
  wheel:guide('跪姿健腹輪', [image('kneeling-wheel.svg','示意圖：跪姿短幅度推出，再控制拉回')], ['雙膝跪在墊上，雙手握輪，輪子放在肩膀前方。','收腹、臀部微收，慢慢往前推一小段，腰背保持穩定。','只到能控制的距離，再慢慢拉回起始。'], '不要追求伸很遠；腰塌、腰痛或無法控制時停止，跳過這個動作。',video('jxI38HM2pBY','Tom Kay')),
  cobra:guide('低眼鏡蛇式輕伸展', [image('low-cobra.svg','示意圖：趴姿 → 肘保持彎曲，胸口輕抬')], ['趴在墊上，手掌放在肩膀旁，腳背貼地。','肩膀遠離耳朵，吸氣時胸口輕輕抬起，肘保持彎曲。','骨盆留在墊上，舒服地呼吸，再慢慢放下。'], '只做輕微伸展，影片中的高幅度不必跟到；腰部不舒服就跳過。',video('n6jrC6WeF84','Yoga With Adriene')),
  child:guide('嬰兒式', [image('child-pose.jpg','臀部往腳跟方向坐，額頭往墊上放鬆；圖中手放身側')], ['跪姿開始，膝蓋可稍微分開，臀部往腳跟方向坐。','上身向前放鬆，額頭靠墊或折好的毛巾；手可放身側或向前伸。','慢慢呼吸，讓背部放鬆，結束時慢慢起身。'], '膝蓋不舒服就墊毛巾或跳過，不硬壓臀部。',video('eqVMAPM00DM','Yoga With Adriene')),
  rope:guide('無繩跳繩', [image('rope-jump.svg','示意圖：雙腳小幅度跳、手在身側畫圈；也可改踏步')], ['站穩，手肘靠近身體，手腕像轉繩一樣小幅畫圈。','雙腳低低跳起，前腳掌柔軟落地，膝蓋保持彈性。','舒服速度維持節奏；快節奏只是稍微加快，不必跳更高。'], '不想跳或關節不舒服就改原地踏步；落地輕、不憋氣。'),
  side:guide('側併步（不跳版本）', [image('side-step.svg','示意圖：右腳側踏、左腳靠近，再換左側')], ['雙腳站穩，右腳向右跨一小步。','左腳靠近右腳，再用左腳向左跨、右腳靠近。','左右交替，手臂自然擺動；熟悉後才小幅加快。'], '腳不交叉，膝蓋朝腳尖方向；初學先用這個不跳版本。'),
  squat:guide('高腳杯深蹲', [image('goblet-squat.svg','示意圖：抱一顆啞鈴站穩 → 髖膝彎曲下蹲')], ['雙腳約肩寬，腳尖稍微向外，雙手把一顆啞鈴抱在胸前。','腳掌踩穩，臀部向後下方坐，膝蓋跟腳尖同方向。','到能保持背部自然的深度，踩地站回來。'], '不必蹲到很低。7.5 kg 太重可改徒手；腳跟不要浮起。',video('deFlElhWtZI')),
  row:guide('單臂啞鈴划船', [image('dumbbell-row.png','同側膝與手支撐穩固長凳，另一手把啞鈴拉向腰側')], ['用穩固的長凳支撐一手與同側膝，另一腳踩地；沒有安全支撐就先跳過。','另一手握啞鈴垂下，背部保持自然，肘往後拉向腰側。','慢慢放下，完成該側再換邊。'], '不要扭轉身體或聳肩；不用帶輪或容易翻倒的家具。',video('aY6zJ6hOOes')),
  press:guide('站姿啞鈴肩推', [image('standing-press.svg','示意圖：啞鈴在肩旁 → 向上推，軀幹保持直立')], ['雙腳站穩，雙手啞鈴放在肩旁，手腕保持直。','收腹，不後仰，把啞鈴往上推到能控制的位置。','慢慢降回肩旁，再重複。'], '兩個 7.5 kg 可能太重；改較輕重量、徒手或跳過，不用腰甩。',video('BRkqAl8EHCQ')),
  rdl:guide('啞鈴羅馬尼亞硬舉', [image('rdl.webp','膝微彎、臀部往後，啞鈴沿腿前下移，再站回')], ['雙腳約髖寬，膝微彎，雙手啞鈴放在大腿前。','臀部往後推，背部保持自然，啞鈴貼近腿慢慢下降。','腿後側有拉伸感、仍能控制時就停止下降，再收臀站回。'], '這是髖部折疊，不是彎腰駝背，也不必把啞鈴放到地上。',video('vaeFQToTAk4')),
  legs:guide('小腿與大腿前側伸展', [image('calf-stretch.jpg','小腿：扶牆前弓後直，後腳跟踩地'),image('quad-stretch.png','大腿前側：扶穩，握同側腳踝，膝蓋朝下')], ['小腿：扶牆，一腳在後伸直、腳跟踩地，前膝微彎。','大腿前側：扶穩固定支撐，一手握同側腳踝，腳跟輕靠臀部。','每側舒服維持約 20–30 秒再換邊，正常呼吸。'], '不要彈震、不要硬拉腳踝；站不穩就停止。'),
  relax:guide('全身放鬆', [image('relaxation.svg','示意圖：慢走鬆臂，再輕輕展胸肩'),image('calf-stretch.jpg','小腿伸展：扶牆、後腳跟踩地')], ['先慢走，手臂放鬆，讓呼吸漸漸平穩。','站穩，雙手可在身後輕握、向下延伸，胸口自然打開。','再扶牆做左右小腿伸展，各約 20–30 秒。'], '胸肩不強拉、不後仰。整段只做到舒服的範圍。'),
};
export function guideForStep(step) {
  if (!step || step.p==='休息') return null;
  const id=step.id;
  const key = id.includes('cat-cow')?'catcow':id.includes('dead-bug')?'deadbug':id.includes('reverse-crunch')?'reverse':id.includes('heel-tap')?'heel':id.includes('plank')?'plank':id.includes('wheel')?'wheel':id.includes('cobra')?'cobra':id.includes('child-pose')?'child':id.includes('mobility')?'mobility':id.includes('side-step')?'side':id.includes('squat')?'squat':id.includes('row-')?'row':id.includes('press-')?'press':id.includes('rdl-')?'rdl':id==='cardio-stretch'?'legs':id==='full-stretch'?'relax':id==='full-warmup'?'warmup':/cardio-(steady|fast|final)/.test(id)?'rope':/(march|recovery|cool-walk)/.test(id)?'march':null;
  return movementGuides[key];
}
movementGuides.march.video=video('Dwt8KGyuqL0','GVSU Human Resources');
movementGuides.mobility.video=video('uV0I5adTRXw','MyMichiganHealth（腳踝繞圈）');
movementGuides.mobility.extraVideos=[video('qiyTtBPxyIs','Virginia Mason Franciscan Health（肩繞圈）')];
movementGuides.rope.video=video('Mj6NezKTLmw','Mayo Clinic');
movementGuides.side.video=video('kdvD6ybN8HA','Fitness Academy Europe');
movementGuides.legs.video=video('mafo7o7OnFo','Hospital for Special Surgery（小腿）');
movementGuides.legs.extraVideos=[video('zi5__zBRzYc','Baptist Health（大腿前側）')];
movementGuides.relax.video=movementGuides.march.video;
movementGuides.relax.extraVideos=[movementGuides.legs.video];
movementGuides.warmup=guide('原地踏步＋肩繞環',[...movementGuides.march.images,...movementGuides.mobility.images],['站穩，先左右交替踏步，手臂自然擺動。','肩膀慢慢向上、向後、向下繞小圈，不需要大幅甩臂。','繼續輕鬆踏步，把全身熱起來，正常呼吸。'],'腳踝畫圈是可選的暖身補充；扶穩再做。',movementGuides.march.video);
movementGuides.warmup.extraVideos=movementGuides.mobility.extraVideos;
