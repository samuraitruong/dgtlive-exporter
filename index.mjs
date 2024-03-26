import axios from "axios";
import moment from "moment";
import fs from "fs";

// const tournamentId = "acf4f63a-c6d5-4943-99c3-9837e099c949";
// const tournamentId = "babfc4d8-78a4-4455-81b1-ac459399ee30";
async function getTournament(id) {
  const { data } = await axios.get(
    `https://1.pool.livechesscloud.com/get/${id}/tournament.json`
  );
  return data;
}

async function getPairings(id, round) {
  const url = `https://1.pool.livechesscloud.com/get/${id}/round-${round}/index.json`;

  const { data } = await axios.get(url);

  return data.pairings;
}

async function getGame(id, round, game) {
  const url = `https://1.pool.livechesscloud.com/get/${id}/round-${round}/game-${game}.json`;

  const { data } = await axios.get(url);
  data.round = round;
  return data;
}
function generatePgn(tournament, pair, game) {
  const resultMap = {
    WHITEWIN: "1-0",
    BLACKWIN: "0-1",
    DRAW: "1/2-1/2",
  };
  const d = moment(game.firstMove);

  const moves = game.moves.map((el, index) => {
    const m = el.split(" ")[0].replace(",", "");

    if (index % 2 === 0) {
      return `${index / 2 + 1}. ${m}`;
    }
    return m;
  });
  const folder = `data/${tournament.name}/${game.round}/`;
  fs.mkdirSync(folder, { recursive: true });

  let result = pair.result;

  const lastMove = moves[moves.length - 1];
  console.log("last move", lastMove);
  if (lastMove) {
    if (lastMove.includes("#")) {
      if (moves.length % 2 === 0) {
        result = "0-1";
      } else {
        result = "1-0";
      }
    } else {
      result = "1/2-1/2";
    }
  }
  if (game.live === false && resultMap[game.result]) {
    result = resultMap[game.result];
  }
  console.log(game);
  const filename =
    `${folder}/${pair.white.lname},${pair.white.fname} vs ${pair.black.lname},${pair.black.fname} ${result}.pgn`.replace(
      "1/2-1/2",
      "½-½"
    );

  const pgn = `
    [Event "${tournament.name}"]
    [Site "${tournament.location || "Hobsons Bay Chess Club"}]
    [White "${pair.white.lname},${pair.white.fname}"]
    [Black "${pair.black.lname},${pair.black.fname}"]
    [BlackElo ""]
    [WhiteElo ""]
    [Board ""]
    [Round "${game.round}"]
    [Result "${result}"]
    [Date "${d.format("yyyy.MM.DD")}"]

    ${moves.join(" ")}
    `
    .split("\n")
    .map((x) => x.trim())
    .join("\n");
  fs.writeFileSync(filename, pgn);

  return pgn;
}
async function fetchMe(tournamentId) {
  const tournament = await getTournament(tournamentId);

  console.log(tournament);

  // const rounds = tournament.rounds.filter((x) => x.count > 0);
  const fetchRound = async (round) => {
    let index = 1;
    const pairings = await getPairings(tournamentId, round);
    for await (const p of pairings) {
      console.log(p);
      const game = await getGame(tournamentId, round, index);
      index++;

      const pgn = generatePgn(tournament, p, game);
      console.log(pgn);
    }
  };
  await Promise.all(
    tournament.rounds
      .filter((x) => x.count > 0)
      .map((x, index) => fetchRound(index + 1))
  );
}

async function main() {
  // Junior
  // cjs id
  const bobHounourableID = "acf4f63a-c6d5-4943-99c3-9837e099c949";
  const cjsPurdyCupID = "63d56a4e-1f21-4adc-a021-1259bcb38b27";
  const cjsPurdyCupSeniorID = "50bf1956-ea74-4631-9b00-cfdbace58111";
  await fetchMe(cjsPurdyCupID);
  // Senior
  await fetchMe(cjsPurdyCupSeniorID);
}

main();
