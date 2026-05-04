const TYPE_TO_GROUP = {
  COUPURE_TOTALE: 1,
  QUALITE_DEGRADEE: 1,
  MODEM_DEFECTUEUX: 2,
  CABLE_ENDOMMAGE: 2,
  CONFIG_MODEM: 3,
  DEBIT_FAIBLE: 3,
};

const TYPE_SCORE_BY_GROUP = {
  1: 1.0,
  2: 0.7,
  3: 0.4,
};

const priorityFromScore = (score) => {
  if (score >= 85) return "TRES_ELEVEE";
  if (score >= 60) return "ELEVEE";
  if (score >= 40) return "MOYENNE";
  return "BASSE";
};

const computeDynamicTicketAi = ({ typeProbleme, creationDate, tempsReponsePrevu, statut }) => {
  if (!typeProbleme || !creationDate || tempsReponsePrevu == null) {
    return null;
  }

  // Un ticket cloture ne doit plus exposer de metriques IA dynamiques.
  if (statut === "CLOTURE") {
    return null;
  }

  const typeGroup = TYPE_TO_GROUP[typeProbleme];
  const typeScore = TYPE_SCORE_BY_GROUP[typeGroup];

  if (!typeScore) {
    return null;
  }

  const createdAt = new Date(creationDate);
  if (Number.isNaN(createdAt.getTime())) {
    return null;
  }

  const waitingHours = Math.max(0, (Date.now() - createdAt.getTime()) / 3600000);
  const waitingNormalized = Math.min(1, waitingHours / 24);

  const safePrediction = Math.max(Number(tempsReponsePrevu), 0.1);
  const slaRatio = waitingHours / safePrediction;
  const slaNormalized = Math.min(1, Math.max(0, slaRatio));

  let score = 100 * (
    0.4 * typeScore
    + 0.3 * waitingNormalized
    + 0.3 * slaNormalized
  );

  if (slaRatio > 1) {
    score += 10;
  }

  score = Math.max(0, Math.min(100, score));

  return {
    score: Number(score.toFixed(2)),
    priorite: priorityFromScore(score),
    waitingHours: Number(waitingHours.toFixed(2)),
    slaRatio: Number(slaRatio.toFixed(3)),
  };
};

module.exports = {
  computeDynamicTicketAi,
};
