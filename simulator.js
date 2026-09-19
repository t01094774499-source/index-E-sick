// Educational Mobility Eco & Cost Simulator
class MobilitySimulator {
  constructor() {
    this.distanceInput = document.getElementById('simDistanceInput');
    this.fuelPriceInput = document.getElementById('simFuelPriceInput');
    this.compareSelect = document.getElementById('simCompareSelect');

    this.resMorningFuel = document.getElementById('resMorningFuel');
    this.resCompareFuel = document.getElementById('resCompareFuel');
    this.resYearlySavings = document.getElementById('resYearlySavings');
    this.resTaxSavings = document.getElementById('resTaxSavings');
    this.resTotalBenefits = document.getElementById('resTotalBenefits');
    this.resCo2Reduction = document.getElementById('resCo2Reduction');

    this.bindEvents();
    this.calculate();
  }

  bindEvents() {
    [this.distanceInput, this.fuelPriceInput, this.compareSelect].forEach(elem => {
      if (elem) {
        elem.addEventListener('input', () => this.calculate());
        elem.addEventListener('change', () => this.calculate());
      }
    });
  }

  calculate() {
    const kmPerMonth = parseFloat(this.distanceInput?.value || 1000);
    const fuelPrice = parseFloat(this.fuelPriceInput?.value || 1650);
    const compareCar = this.compareSelect?.value || 'sedan20';

    // Morning Economy Specs
    const morningFuelEfficiency = 15.7; // km/L
    const morningTax = 104000; // 원/년 (1,000cc 미만)
    const morningCo2PerKm = 104; // g/km

    // Compare Car Specs
    let compareFuelEfficiency = 12.5; // 2.0L 중형 세단
    let compareTax = 520000; // 원/년
    let compareCo2PerKm = 140; // g/km
    let compareName = '2.0L 중형 세단';

    if (compareCar === 'sedan16') {
      compareFuelEfficiency = 14.5;
      compareTax = 290000;
      compareCo2PerKm = 120;
      compareName = '1.6L 준중형 세단';
    } else if (compareCar === 'suv20') {
      compareFuelEfficiency = 10.8;
      compareTax = 520000;
      compareCo2PerKm = 165;
      compareName = '2.0L 중형 SUV';
    }

    // Monthly Fuel
    const morningMonthlyFuel = Math.round((kmPerMonth / morningFuelEfficiency) * fuelPrice);
    const compareMonthlyFuel = Math.round((kmPerMonth / compareFuelEfficiency) * fuelPrice);
    const yearlyFuelSavings = (compareMonthlyFuel - morningMonthlyFuel) * 12;

    // Annual Tax Savings
    const yearlyTaxSavings = compareTax - morningTax;

    // Toll & Public Parking 50% discount estimated savings
    const yearlyTollParkingSavings = Math.round((kmPerMonth / 1000) * 360000);

    // Total Benefits
    const totalYearlyBenefits = yearlyFuelSavings + yearlyTaxSavings + yearlyTollParkingSavings;

    // CO2 Reduction (kg/year)
    const co2ReductionKg = Math.round(((compareCo2PerKm - morningCo2PerKm) * kmPerMonth * 12) / 1000);

    // DOM Updates
    if (this.resMorningFuel) this.resMorningFuel.textContent = `${morningMonthlyFuel.toLocaleString()}원`;
    if (this.resCompareFuel) this.resCompareFuel.textContent = `${compareMonthlyFuel.toLocaleString()}원`;
    if (this.resYearlySavings) this.resYearlySavings.textContent = `${yearlyFuelSavings.toLocaleString()}원`;
    if (this.resTaxSavings) this.resTaxSavings.textContent = `${yearlyTaxSavings.toLocaleString()}원`;
    if (this.resTotalBenefits) this.resTotalBenefits.textContent = `${totalYearlyBenefits.toLocaleString()}원 / 년`;
    if (this.resCo2Reduction) this.resCo2Reduction.textContent = `${co2ReductionKg.toLocaleString()} kg CO₂ (소나무 ${Math.round(co2ReductionKg / 6.6)}그루 효과)`;
  }
}

window.MobilitySimulator = MobilitySimulator;
