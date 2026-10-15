export type CourseStep = {
  id: string;
  ask: string;
  title: string;
  forces: string;
  stop: string;
  gravel: string;
  highway: string;
  types: string[];
};

export type BaseQuestion = {
  id: string;
  ask: string;
  lands: string;
  keep: string;
  stop: string;
};

export const baseQuestions: BaseQuestion[] = [
  {
    id: '1',
    ask: '他会单独点开这种东西吗？',
    lands: '会。这就叫 Object type。点开的那一个叫 Object。认它靠上面的一个字符串，全库不能撞号。',
    keep: '换个别的活儿，还是问这一句。以前的事用很多条记录分开。不要为每一天新造一种类型。',
    stop: '它要是别的东西上的一个数、一句话，或者两件事之间的关系，先别建成 Object type。',
  },
  {
    id: '2',
    ask: '它只是这一件上的一个数、一个日期，或者一句话吗？',
    lands: '是。这就叫 Property。某一条上的那个值叫 property value。数从哪来，只有四种：外面记下来的，打开时算的，到点写回去的，人点确认时写下的。',
    keep: '人点确认写下的，后面重算盖不住。同一个意思只有一处公式。认它的号码、列表上的名字，也是 Property，不是新类型。',
    stop: '这个值还能单独点开成一件事，就回到上一问。',
  },
  {
    id: '3',
    ask: '它是两件都能单独点开的东西之间的关系吗？',
    lands: '是。这就叫 Link type。具体那一条叫 Link。关系有方向，也有一对多还是多对多。两头都在同一套里。',
    keep: '换个别的活儿，还是「从这一件走到那一件」。一对多常常就记在那一列号码上。关系本身还是叫 Link type。多对多可以另有一张表撑着，那张表不因此变成新的 Object type。',
    stop: '只存了一个名字，点不开另一头，就不是 Link type。',
  },
  {
    id: '4',
    ask: '要等人点一下，账才改吗？',
    lands: '要。这就叫 Action type。他点的那一次叫 Action。得写清传什么、改什么、什么情况下不能点。改的是这一套里的记录。送到外面的系统，是另一步。',
    keep: '换个别的活儿，人点一次，还是某个 Action type 的一个 Action。同一个定义点两次，是两次 Action，不是两种类型。',
    stop: '夜里自己重算、页面上那个按钮，都不是 Action type。',
  },
  {
    id: '5',
    ask: '它是拿已经知道的事，算出一件新的事吗？',
    lands: '是。这就叫 Function。同一批输入再跑一次，结果一样。跑一次不是新类型。公式只写在这一处。',
    keep: '页面上算，和到点批量算，都指向这一处 Function。别写成两段。',
    stop: '要是必须记住当时那个数，就抄进这次点确认写下的那一列。公式还是只有这一处。',
  },
  {
    id: '6',
    ask: '它是到点从外面拿数据，或者到点去跑已经有的公式吗？',
    lands: '是。这就叫 Pipeline。它不是上面任何一种类型。它可以把外面的材料收成对象，也可以到点去调用 Function。',
    keep: '换个别的活儿，外面的事实还是从 Pipeline 进来。错了回到源头改。别在对象上手填第二份。',
    stop: '下载、清洗、定时作业，别建成 Object type，也别建成 Action type。',
  },
];

export const reuseLayers = [
  {
    name: '底座',
    reuse: '换什么活儿都照用',
    holds: '上面六问。一个对象、一个数、一条关系、一次点确认，都是「出现一次」，不是再造一种类型。问的顺序不换。',
  },
  {
    name: '这一类活儿',
    reuse: '同一种活儿里反复用。换种活儿就整包换掉',
    holds: '有哪些对象、每个数在业务上是什么、公式怎么算、外面的数据什么时候进来。沪深交易放的是股票、行情和委托。',
  },
  {
    name: '只这一次',
    reuse: '留在这一次。不写进这种活儿的类型，更不写进底座',
    holds: '这一户有多少钱、今天这几行、他怎么称呼这件事、只做这一池股票。',
  },
];

export const baseOnTrading = [
  { word: 'Object type', here: '开盘安排是一种东西。某一页是其中的一个。' },
  { word: 'Property', here: '页首那一句是这一页上的一个值。人确认时写下的那句，后来重算盖不住。' },
  { word: 'Link type', here: '这一页属于哪一户。从安排走到账户。' },
  { word: 'Action type', here: '确认卖出是允许的一种改法。交易员点一次，就是一次。' },
  { word: 'Function', here: '用前收和板块算出涨停价。公式在一处。算一次不是新类型。' },
  { word: 'Pipeline', here: '收盘后把行情收成日行情。这一步不是人点确认，也不是一种对象。' },
];

export const coreWalk = [
  {
    id: '1',
    title: '空着手坐下',
    body: '他往往说不清系统要做什么。他能说的是担心：明天开盘我得知道卖什么、买什么，或者今天不动。这句话得他改过，才算这次要做的。他还在摇头，先别建类型。',
  },
  {
    id: '2',
    title: '先做只够明天用的一页',
    body: '做出一页，让他指着说就是这一下。这一户的现金、今天这几行，糙一点也行。他指不出来，这页就还是我们自己觉得好。',
  },
  {
    id: '3',
    title: '当天拆开',
    body: '换一个账户、换一个交易日、换一版规矩，哪一段还在？还在的，才写成大家都能用的。只这一次的，留在这次，别偷偷写进类型。',
  },
  {
    id: '4',
    title: '写成别人找得到的东西',
    body: '对象、谁能写、公式、确认动作，放在库里。另一个没坐在这个交易员旁边的人，能按这些做下一次，不用打电话问你。做不到，就还是笔记。',
  },
  {
    id: '5',
    title: '下次先走已经修好的路',
    body: '下一个交易日，先用已经有的开盘安排、卖出行和确认规则。只把还说不清的再做，比如这一版回马枪怎么打分。说不出这次省了哪一截，说明上次没留下能共用的东西。',
  },
];

export const courseSteps: CourseStep[] = [
  {
    id: '1',
    ask: '到了明天开盘，他必须已经看见什么，否则这天就算失败？',
    title: '用明早 9:25 的一页判定卖、买，还是今天不动',
    forces: '还没有对象。这一步只把要做的事说成一句他能重复的话。',
    stop: '先不下载行情，先不列因子。',
    gravel: '这一天他担心什么，以及他习惯怎么叫这件事。',
    highway: '失败长什么样，写成这一句。下一个交易日还用它，别再另起一个目标。',
    types: [],
  },
  {
    id: '2',
    ask: '这一页属于谁？明天换了一版规矩，今天这页还认不认？',
    title: '记下这份安排属于哪一户、哪一天、哪一版规矩，日后改规矩也不改它',
    forces: '开盘安排、账户、交易日、做法。',
    stop: '改规矩就是新的一个做法对象。旧安排还指向写下时的那一版。',
    gravel: '这一户的名称、这一天、这一版规矩叫什么。',
    highway: '一页指向一户、一天、一版做法。换规矩就新建做法，不改旧页。下一个账户还用这条。',
    types: ['PreOpenArrangement', 'Account', 'TradingDay', 'Strategy'],
  },
  {
    id: '3',
    ask: '他的眼睛落在整页上，还是落在一行一行上？',
    title: '写下两行给交易员看：一行卖出、一行买入，股数和价格就在行上',
    forces: '卖出行、买入行。股数和限价是行上的数。',
    stop: '行上的股数和价格，别再单独做成一种东西。',
    gravel: '今天这几行具体的股数和价格。',
    highway: '一行是一个对象，股数和限价是它上面的数。下次别为每一行发明一种新类型。',
    types: ['SellLine', 'BuyLine'],
  },
  {
    id: '4',
    ask: '谁有权把「算出来」变成「要送出去」？',
    title: '等人点下确认，才生成要送出的委托',
    forces: '卖出委托、买入委托。动作是确认卖出、确认买入。',
    stop: '算出这一行的过程没有人点确认。',
    gravel: '今天是谁点的确认。',
    highway: '确认是动作，算出这一行是公式。确认当时看见的那一句写下之后，后来重算盖不住。下次先用这条，别再吵按钮能不能改掉已经发生的事。',
    types: ['SellOrder', 'BuyOrder'],
  },
  {
    id: '5',
    ask: '卖的是不是手里有的？今天先别买的时候，挑中的那只还留不留？',
    title: '限定卖出只卖手里有的股票；今天不许买时，买入行留空，挑中的股票还留着',
    forces: '持仓、股票、信号。今天允不允许新开，记在交易日上。',
    stop: '门关着的时候，别把「空仓」做成对象，也别把「继续拿着」做成对象。',
    gravel: '这一户今天的持仓，以及这一版今天挑出来的名单。',
    highway: '卖出行指向已经有的持仓。门关着可以没有买入行，信号还留着对照。下次再遇到「先别买」，先用这条，别新建一种叫空仓的对象。',
    types: ['Position', 'Stock', 'Signal', 'TradingDay'],
  },
  {
    id: '6',
    ask: '成交回来之后改什么？过几周复盘，还要不要另起一张表？',
    title: '等成交回报到了再改持仓，周月复盘只读这些已发生的记录',
    forces: '成交。评估、评估点、评估成交放在明早那一页之外。',
    stop: '复盘别再另存一套和线上对不上的表。',
    gravel: '这一笔券商回报的编号，以及这一次评估看的是哪一段。',
    highway: '成交记下价和股数，之后不能改。评估读已经发生的对象。下次别再私下存一套回测表。',
    types: ['Fill', 'EvaluationRun', 'EvaluationPoint', 'EvaluationTrade'],
  },
  {
    id: '7',
    ask: '人走了以后，下一个没在现场的人靠什么接着走？',
    title: '让交易员、学名词的人、管理员各看各的一屏',
    forces: '交易员看开盘安排。学的人看这条思考。管定义的人看库里现在按什么规则写。',
    stop: '页面只展示已经写下的句子，别再发明规则。',
    gravel: '只存在你脑子里的讲解。',
    highway: '三块屏都在。别人找不到这处能共用的东西，这次现场就不算做完。',
    types: [],
  },
];

export type TypeRing = {
  id: string;
  label: string;
  note: string;
  types: string[];
};

export const typeRings: TypeRing[] = [
  {
    id: 'center',
    label: '中心',
    note: '第 2 步。某一户、某一个交易日、当时那一版规矩，合成一页。',
    types: ['PreOpenArrangement'],
  },
  {
    id: 'inner',
    label: '第一圈',
    note: '第 3、4 步。交易员先看行，人点确认之后才有委托。',
    types: ['SellLine', 'BuyLine', 'SellOrder', 'BuyOrder'],
  },
  {
    id: 'middle',
    label: '第二圈',
    note: '第 2、5 步。卖出指回手里的持仓。今天先别买时，信号还留着对照。',
    types: ['Position', 'Signal', 'Account', 'Strategy', 'TradingDay', 'Stock'],
  },
  {
    id: 'outer',
    label: '第三圈',
    note: '第 5、6 步。今天能不能买卖，记在这一天。均线、波动大小和涨停价，记在这只股票的这一天。成交到了才改持仓。',
    types: ['DailyBar', 'Industry', 'TradableRange', 'Fill'],
  },
  {
    id: 'eval',
    label: '外侧 · 周月才打开',
    note: '第 6 步。一次评估要能单独点开。它们不进明早 9:25 那一页。',
    types: ['EvaluationRun', 'EvaluationPoint', 'EvaluationTrade'],
  },
];

export const refusedNames = [
  '公司',
  '交易所',
  '批准信号',
  '把明天做成一种每天新建的类型',
  '因子对象',
  '止损价对象',
];

export const typeWhy: Record<string, string> = {
  PreOpenArrangement: '某一户、某一个交易日、当时那一版规矩，合成一页。',
  SellLine: '交易员要看的一行卖出。',
  BuyLine: '交易员要看的一行买入。',
  SellOrder: '人点确认卖出之后才生成。',
  BuyOrder: '人点确认买入之后才生成。',
  Position: '卖出只能卖这户已经拿着的。',
  Account: '安排和持仓要能指回哪一户。',
  Stock: '行和持仓要能指回哪一只。',
  Signal: '今天挑出来准备买的。今天先别买时，买入行可以空，挑中的还留着对照。',
  Strategy: '安排写下时带着当时那一版规矩。以后改规矩，不改这份安排。',
  TradingDay: '今天允不允许新开仓，记在这一天上。',
  DailyBar: '这只股票这一天的价，以及由这些价算出来的数。',
  Industry: '同一行业买得太多时，要能点开是哪一个行业。',
  TradableRange: '今天在哪一个范围里挑。',
  Fill: '回报到了，才改持仓上的股数。',
  EvaluationRun: '周月要能单独打开一次评估。',
  EvaluationPoint: '这一次评估在某一天的权益和回撤。',
  EvaluationTrade: '这一次评估里已经发生的一笔买卖。',
};

export const typeStep: Record<string, string> = {
  PreOpenArrangement: '第 2 步',
  Account: '第 2 步',
  TradingDay: '第 2 步',
  Strategy: '第 2 步',
  SellLine: '第 3 步',
  BuyLine: '第 3 步',
  SellOrder: '第 4 步',
  BuyOrder: '第 4 步',
  Position: '第 5 步',
  Stock: '第 5 步',
  Signal: '第 5 步',
  DailyBar: '地图备注',
  Industry: '地图备注',
  TradableRange: '地图备注',
  Fill: '第 6 步',
  EvaluationRun: '第 6 步',
  EvaluationPoint: '第 6 步',
  EvaluationTrade: '第 6 步',
};

export const liveActions = new Set(['ConfirmSells', 'ConfirmBuys', 'ReportFill']);

export const definedActions = new Set([
  'PostponeSellLine',
  'VetoBuyLine',
  'StopArrangement',
  'AcknowledgeNothingToSend',
]);

export function actionStatus(apiName: string): string {
  if (liveActions.has(apiName)) return '服务现在能提交';
  if (definedActions.has(apiName)) return '定义写了，按钮还没接到服务';
  return '代码目录里的定义';
}
