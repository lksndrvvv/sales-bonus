/**
 * Функция для расчета выручки
 * @param purchase запись о покупке
 * @param _product карточка товара
 * @returns {number}
 */
function calculateSimpleRevenue(purchase, _product) {
  // purchase — это одна из записей в поле items из чека в data.purchase_records
  // _product — это продукт из коллекции data.products

  // @TODO: Расчет выручки от операции

  const { sale_price, quantity } = purchase;
  const discount = 1 - purchase.discount / 100;
  return sale_price * quantity * discount;
}



/**
 * Функция для расчета бонусов
 * @param index порядковый номер в отсортированном массиве
 * @param total общее число продавцов
 * @param seller карточка продавца
 * @returns {number}
 */
function calculateBonusByProfit(index, total, seller) {
  // @TODO: Расчет бонуса от позиции в рейтинге
  const { profit } = seller;
  // const profit = seller.profit;

  if (index === 0) {
    return profit * 0.15;
  } else if (index === 1 || index === 2) {
    return profit * 0.1;
  } else if (index === total - 1) {
    return 0;
  } else {
    // Для всех остальных
    return profit * 0.05;
  }
}



/**
 * Функция для анализа данных продаж
 * @param data
 * @param options
 * @returns {{revenue, top_products, bonus, name, sales_count, profit, seller_id}[]}
 */
function analyzeSalesData(data, options) {

  // @TODO: Проверка входных данных

  if (
    !data ||
    !Array.isArray(data.sellers) ||
    !Array.isArray(data.products) ||
    !Array.isArray(data.purchase_records) ||
    data.sellers.length === 0 ||
    data.products.length === 0 ||
    data.purchase_records.length === 0
  ) {
    throw new Error("Некорректные входные данные");
  }


  // @TODO: Проверка наличия опций

  if (!options || typeof options !== "object") {
    throw new Error("Некорректные опции");
  }
  const { calculateRevenue, calculateBonus } = options;
  // const calculateRevenue = options.calculateRevenue;
  // const calculateBonus = options.calculateBonus;

  if (
    typeof calculateRevenue !== "function" ||
    typeof calculateBonus !== "function"
  ) {
    throw new Error("Некорректные опции");
  }


  // @TODO: Подготовка промежуточных данных для сбора статистики

  const sellerStats = data.sellers.map((seller) => ({
    seller_id: seller.id,
    name: `${seller.first_name} ${seller.last_name}`,
    revenue: 0, //выручка
    profit: 0, //прибыль
    sales_count: 0, //кол-во продаж
    products_sold: {}, //проданные товары
  }));


  // @TODO: Индексация продавцов и товаров для быстрого доступа

  const sellerIndex = Object.fromEntries(
    sellerStats.map((item) => [item.seller_id, item]),
  ); // Ключом будет id, значением — запись из sellerStats
  const productIndex = Object.fromEntries(
    data.products.map((item) => [item.sku, item]),
  ); // Ключом будет sku, значением — запись из data.products

  // @TODO: Расчет выручки и прибыли для каждого продавца

  data.purchase_records.forEach((record) => {
    // Чек
    const seller = sellerIndex[record.seller_id]; // Продавец
    // Увеличить количество продаж
    seller.sales_count += 1;
    // Увеличить общую сумму выручки всех продаж
    seller.revenue += record.total_amount;

    // Расчёт прибыли для каждого товара
    record.items.forEach((item) => {
      const product = productIndex[item.sku]; // Товар
      // Посчитать себестоимость (cost) товара как product.purchase_price, умноженную на количество товаров из чека
      const cost = product.purchase_price * item.quantity;
      // Посчитать выручку (revenue) с учётом скидки через функцию calculateRevenue
      const revenue = calculateRevenue(item, product);
      // Посчитать прибыль: выручка минус себестоимость
      const profit = revenue - cost;
      // Увеличить общую накопленную прибыль (profit) у продавца
      seller.profit += profit;

      // Учёт количества проданных товаров
      if (!seller.products_sold[item.sku]) {
        seller.products_sold[item.sku] = 0;
      }
      // По артикулу товара увеличить его проданное количество у продавца
      seller.products_sold[item.sku] += item.quantity;
    });
  });


  // @TODO: Сортировка продавцов по прибыли

  sellerStats.sort((a, b) => b.profit - a.profit);


  // @TODO: Назначение премий на основе ранжирования

  sellerStats.forEach((seller, index) => {
    seller.bonus = calculateBonus(index, sellerStats.length, seller); // Считаем бонус
    seller.top_products = Object.entries(seller.products_sold)
      .map(([sku, quantity]) => ({ sku, quantity }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10); // Формируем топ-10 товаров
  });


  // @TODO: Подготовка итоговой коллекции с нужными полями

  return sellerStats.map((seller) => ({
    seller_id: seller.seller_id, // Строка, идентификатор продавца
    name: seller.name, // Строка, имя продавца
    revenue: +seller.revenue.toFixed(2), // Число с двумя знаками после точки, выручка продавца
    profit: +seller.profit.toFixed(2), // Число с двумя знаками после точки, прибыль продавца
    sales_count: seller.sales_count, // Целое число, количество продаж продавца
    top_products: seller.top_products, // Массив объектов вида: { "sku": "SKU_008","quantity": 10}, топ-10 товаров продавца
    bonus: +seller.bonus.toFixed(2), // Число с двумя знаками после точки, бонус продавца
  }));
}

// [{
//     seller_id: 'seller_1', // Идентификатор продавца
//     name: 'Alexey Petrov', // Имя и фамилия продавца
//     revenue: 123456, // Общая выручка с учётом скидок
//     profit: 12345, // Прибыль от продаж продавца
//     sales_count: 20, // Количество продаж
//     top_products: [  // Топ-10 проданных товаров в штуках
//         {
//             sku: 'SKU_001', // Артикул товара
//             quantity: 12, // Сколько продано
//         },
//     ],
//     bonus: 1234, // Итоговый бонус в рублях, не процент
// }];


// if (typeof module !== "undefined") {
//   module.exports = {
//     calculateSimpleRevenue,
//     calculateBonusByProfit,
//     analyzeSalesData,
//   };
// }