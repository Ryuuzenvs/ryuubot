let modes = {
  noob: [-3, 3, -3, 3, "+-", 15000, 1],
  easy: [-10, 10, -10, 10, "*/+-", 20000, 1],
  medium: [-40, 40, -20, 20, "*/+-", 40000, 2],
  hard: [-100, 100, -70, 70, "*/+-", 60000, 3],
  extreme: [-999999, 999999, -999999, 999999, "*/", 99999, 3],
  impossible: [
    -99999999999,
    99999999999,
    -99999999999,
    999999999999,
    "*/",
    30000,
    3,
  ],
  impossible2: [
    -999999999999999,
    999999999999999,
    -999,
    999,
    "/",
    30000,
    15,
  ],
};

let operators = {
  "+": "+",
  "-": "-",
  "*": "×",
  "/": "÷",
};

function randomInt(from, to) {
  if (from > to) [from, to] = [to, from];
  from = Math.floor(from);
  to = Math.floor(to);
  return Math.floor((to - from) * Math.random() + from);
}

function pickRandom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function genMath(mode) {
  return new Promise((resolve, reject) => {
    let [a1, a2, b1, b2, ops, time, bonus] = modes[mode];
    let a = randomInt(a1, a2);
    let b = randomInt(b1, b2);
    let op = pickRandom([...ops]);
    let result = new Function(
      `return ${a} ${op.replace("/", "*")} ${b < 0 ? `(${b})` : b}`
    )();
    if (op == "/") [a, result] = [result, a];
     let hasil = {
      soal: `${a} ${operators[op]} ${b}`,
      mode: mode,
      waktu: time,
      hadiah: bonus,
      jawaban: result,
    };
    resolve(hasil);
  });
}

export { modes, operators, randomInt, pickRandom, genMath };
