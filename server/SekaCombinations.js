/**
 * Класс для определения и сравнения сложных комбинаций в Секе.
 * Заменяет простую логику "до 21 очка".
 */
class SekaCombinations {

    static RANK_VALUES = {
        '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
        'J': 11, 'Q': 12, 'K': 13, 'A': 14,
        'Joker': 15 // Джокер как самый высокий ранг для СЕКИ
    };

    // Иерархия Приоритетов для сравнения комбинаций
    static PRIORITY = {
        SEKA: 5,         // СЕКА ТУЗОВ, КОР., ДАМ, ВАЛ., 10
        TRIDTSAT_PLUS: 4,// 32, 31, 30
        DVADTSAT_PLUS: 3,// 22, 21, 20
        ODINNADTSAT: 2,  // 11
        DESYAT: 1        // 10
    };

    /**
     * Возвращает объект с рангом, типом и очками руки игрока.
     * @param {Array<Object>} cards - 3 карты игрока
     * @returns {{priority: number, rankValue: number, points: number, isSekaTuzovNoJoker: boolean}}
     */
    static getCombinationRank(cards) {
        const ranks = cards.map(c => c.rank);
        const suits = cards.map(c => c.suit);
        const hasJoker = ranks.includes('Joker');
        const actualCards = cards.filter(c => c.rank !== 'Joker');
        const actualRanks = actualCards.map(c => c.rank);
        const actualSuits = actualCards.map(c => c.suit);
        let combination = { priority: 0, rankValue: 0, points: 0, isSekaTuzovNoJoker: false };

        // --- 1. Вспомогательные функции ---

        // Подсчет очков по мастям (Туз=11, Фигуры=10, Цифры=номинал)
        const calculateSuitPoints = (cardList) => {
            const pointsMap = { 'A': 11, 'K': 10, 'Q': 10, 'J': 10 };
            const points = {};
            cardList.forEach(c => {
                let p = pointsMap[c.rank] || SekaCombinations.RANK_VALUES[c.rank] || 0;
                points[c.suit] = (points[c.suit] || 0) + p;
            });
            return Object.values(points).length ? Math.max(...Object.values(points)) : 0;
        };

        const maxSuitPoints = calculateSuitPoints(actualCards);
        const allSameSuit = new Set(actualSuits).size === 1;
        const rankCounts = actualRanks.reduce((acc, rank) => {
            acc[rank] = (acc[rank] || 0) + 1;
            return acc;
        }, {});
        const threeSameRank = Object.values(rankCounts).includes(3);
        const twoSameRank = Object.values(rankCounts).includes(2);
        const tuzCount = actualRanks.filter(r => r === 'A').length;

        // --- 2. ПРИОРИТЕТ 1: СЕКА (Тройки) ---
        if (threeSameRank || (twoSameRank && hasJoker)) {
            combination.priority = SekaCombinations.PRIORITY.SEKA;
            
            // Определяем ранг СЕКИ (если 2+Joker, то ранг берется от пары)
            const sekaRank = threeSameRank 
                ? actualRanks.find(r => rankCounts[r] === 3)
                : actualRanks.find(r => rankCounts[r] === 2);
            
            combination.rankValue = SekaCombinations.RANK_VALUES[sekaRank];

            if (sekaRank === 'A' && !hasJoker) {
                combination.isSekaTuzovNoJoker = true; // Для особого штрафа
            }
            return combination;
        }

        // --- 3. ПРИОРИТЕТ 2: КОМБИНАЦИИ 31+ ---

        // 32 ОЧКА (ТРИДЦАТЬ ДВА)
        if (hasJoker && tuzCount === 1) {
            const tuzCard = actualCards.find(c => c.rank === 'A');
            const otherCard = actualCards.find(c => c.rank !== 'A');
            if (otherCard && tuzCard.suit === otherCard.suit) {
                 // Джокер (15) + Туз (11) + Фигура/Цифра (10/номинал) = 32
                 // Примем для простоты подсчета: 32 - это Туз + Джокер + той же масти.
                 combination.priority = SekaCombinations.PRIORITY.TRIDTSAT_PLUS;
                 combination.points = 32;
                 return combination;
            }
        }
        
        // 31 ОЧКО (ТРИДЦАТЬ ОДНО) или 30 ОЧКОВ (СЕКА МАСТЕЙ)
        if (allSameSuit || (hasJoker && new Set(actualSuits).size === 1)) {
            combination.priority = SekaCombinations.PRIORITY.TRIDTSAT_PLUS;
            
            let points = maxSuitPoints; // Очки по масти без Джокера
            
            if (hasJoker) {
                // Если есть Джокер и он используется для создания масти:
                // Учитываем, что Джокер заменяет карту, чтобы получить 31.
                // В вашей системе, Джокер + 2 одной масти = 31.
                points = Math.max(points, calculateSuitPoints(actualCards) + 11); // Условно добавляем 11 за Джокера
            }

            if (tuzCount > 0 && allSameSuit) points = 31; // 3 карты одной масти + Туз
            else if (hasJoker && new Set(actualSuits).size === 1) points = 31; // Джокер + 2 одной масти
            else if (allSameSuit && tuzCount === 0) points = 30; // 3 карты одной масти без Туза (СЕКА МАСТЕЙ)
            
            combination.points = points;
            return combination;
        }


        // --- 4. ПРИОРИТЕТ 3: КОМБИНАЦИИ 21+ (С Тузами) ---
        
        // 22 ОЧКА (ДВА ЛБА)
        if (tuzCount === 2 || (tuzCount === 1 && hasJoker)) {
             combination.priority = SekaCombinations.PRIORITY.DVADTSAT_PLUS;
             combination.points = 22;
             return combination;
        }
        
        // 21 ОЧКО (ОЧКО)
        if (maxSuitPoints === 21 || (hasJoker && new Set(actualRanks).size === 2 && tuzCount === 0)) {
             combination.priority = SekaCombinations.PRIORITY.DVADTSAT_PLUS;
             combination.points = 21;
             return combination;
        }
        
        // 20 ОЧКОВ (ДВАДЦАТЬ)
        if (maxSuitPoints === 20) {
             combination.priority = SekaCombinations.PRIORITY.DVADTSAT_PLUS;
             combination.points = 20;
             return combination;
        }
        
        // --- 5. ПРИОРИТЕТ 4-5: СЛАБЫЕ КОМБИНАЦИИ ---
        
        if (tuzCount === 1) {
            combination.priority = SekaCombinations.PRIORITY.ODINNADTSAT;
            combination.points = 11;
        } else {
            // ДЕСЯТЬ
            combination.priority = SekaCombinations.PRIORITY.DESYAT;
            combination.points = 10;
        }
        
        return combination;
    }


    /**
     * Сравнивает две комбинации.
     * @param {Object} rankA - Ранг первой руки
     * @param {Object} rankB - Ранг второй руки
     * @returns {number} >0 если A > B, <0 если A < B, 0 если A = B
     */
    static compareCombinations(rankA, rankB) {
        // 1. Сравнение по приоритету (СЕКА > 32+ > 22+)
        if (rankA.priority !== rankB.priority) {
            return rankA.priority - rankB.priority;
        }

        // 2. Если приоритеты равны, сравнение по рангу/очкам
        if (rankA.priority === SekaCombinations.PRIORITY.SEKA) {
            // СЕКА: Сравнение по rankValue (Туз vs Король)
            return rankA.rankValue - rankB.rankValue;
        } else {
            // Все остальные: Сравнение по Points (32 vs 31, 22 vs 21)
            return rankA.points - rankB.points;
        }
        
        // Примечание: Если возвращается 0 (ничья), логика Вскрытия (expose) в Game
        // должна решить, кто падает (вскрывающий или Вара).
    }
}

module.exports = SekaCombinations;
