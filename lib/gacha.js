// lib/gacha.js
export function doGacha(count, userData) {
  let results = [];
  let pulls = Math.min(count, 100);

  // Ambil state dari userData atau default ke 0
  let currentPity = userData.gachaPity || 0;
  let isGuaranteed = userData.gachaGuaranteed || false;
  let totalLimitedB5 = 0;
  let totalStandB5 = 0;
  let obtainedB5L = []; // Untuk mencatat di pity berapa dapatnya

  for (let i = 0; i < pulls; i++) {
    currentPity++;
    
    let pullRate = 0.006; // Base rate 0.6%
    if (currentPity >= 81) pullRate = 0.50;
    else if (currentPity >= 60) pullRate = 0.05;
    else if (currentPity <= 20) pullRate = 0.012;

    // Logika Bintang 5
    if (currentPity >= 90 || Math.random() < pullRate) {
      if (isGuaranteed || Math.random() < 0.5) {
        // Dapat Limited
        totalLimitedB5++;
        obtainedB5L.push(currentPity);
        isGuaranteed = false;
        results.push('🌟'); 
      } else {
        // Dapat Standar (Rate Off)
        totalStandB5++;
        isGuaranteed = true;
        results.push('💀');
      }
      currentPity = 0;
    } 
    // Bintang 4
    else if (Math.random() < 0.051) {
      results.push('🐾');
    } 
    // Bintang 3
    else {
      results.push('⚔️');
    }
  }

  return {
    results,
    newPity: currentPity,
    newGuaranteed: isGuaranteed,
    totalLimitedB5,
    totalStandB5,
    obtainedB5L
  };
}
