"use client";

import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";

export default function RetirementCalculator() {
  // Main Settings
  const [currentAge, setCurrentAge] = useState<number>(35);
  const [plannedRetirementAge, setPlannedRetirementAge] = useState<number>(67);
  const [lifeExpectancy, setLifeExpectancy] = useState<number>(85);
  const [currentIncome, setCurrentIncome] = useState<number>(70000);

  // Assumptions
  const [incomeIncreaseRate, setIncomeIncreaseRate] = useState<number>(3);
  const [incomeNeededPercent, setIncomeNeededPercent] = useState<number>(75);
  const [investmentReturnRate, setInvestmentReturnRate] = useState<number>(6);
  const [inflationRate, setInflationRate] = useState<number>(3);

  // Optional
  const [otherIncomeMonthly, setOtherIncomeMonthly] = useState<number>(0);
  const [currentSavings, setCurrentSavings] = useState<number>(30000);
  const [futureSavingsPercent, setFutureSavingsPercent] = useState<number>(10);

  // Results
  const [balanceAtRetirement, setBalanceAtRetirement] = useState<number>(0);
  const [ageDepleted, setAgeDepleted] = useState<number | null>(null);
  const [finalBalance, setFinalBalance] = useState<number>(0);
  const [firstYearIncomeNeeded, setFirstYearIncomeNeeded] = useState<number>(0);

  useEffect(() => {
    let balance = currentSavings;
    let salary = currentIncome;
    const yearsToRetire = Math.max(0, plannedRetirementAge - currentAge);
    const retirementYears = Math.max(0, lifeExpectancy - plannedRetirementAge);

    // Pre-retirement phase
    for (let i = 0; i < yearsToRetire; i++) {
      const annualContribution = salary * (futureSavingsPercent / 100);
      balance = balance * (1 + investmentReturnRate / 100) + annualContribution;
      salary = salary * (1 + incomeIncreaseRate / 100);
    }
    
    setBalanceAtRetirement(balance);

    const neededFirstYear = salary * (incomeNeededPercent / 100);
    setFirstYearIncomeNeeded(neededFirstYear);
    
    let incomeNeededToWithdraw = neededFirstYear - (otherIncomeMonthly * 12);
    if (incomeNeededToWithdraw < 0) incomeNeededToWithdraw = 0;
    
    let depletedAge: number | null = null;
    let isSuccess = true;

    let postRetirementBalance = balance;

    // Post-retirement phase
    for (let i = 0; i < retirementYears; i++) {
      postRetirementBalance = postRetirementBalance * (1 + investmentReturnRate / 100) - incomeNeededToWithdraw;
      
      if (postRetirementBalance <= 0 && isSuccess) {
        isSuccess = false;
        depletedAge = plannedRetirementAge + i;
        postRetirementBalance = 0;
      }
      
      incomeNeededToWithdraw = incomeNeededToWithdraw * (1 + inflationRate / 100);
    }

    setAgeDepleted(depletedAge);
    setFinalBalance(postRetirementBalance);

  }, [
    currentAge, plannedRetirementAge, lifeExpectancy, currentIncome,
    incomeIncreaseRate, incomeNeededPercent, investmentReturnRate, inflationRate,
    otherIncomeMonthly, currentSavings, futureSavingsPercent
  ]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(value);
  };

  const InputRow = ({ label, value, onChange, suffix, prefix, type = "number", min, max }: any) => (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between py-3 border-b border-slate-100 last:border-0 gap-3 hover:bg-slate-50 px-2 -mx-2 rounded-lg transition-colors">
      <label className="text-sm font-medium text-slate-700 w-full sm:w-1/2 cursor-pointer">{label}</label>
      <div className="relative w-full sm:w-48 flex items-center">
        {prefix && <span className="absolute left-3 text-slate-500 text-sm font-medium z-10">{prefix}</span>}
        <input 
          type={type} 
          value={value} 
          onChange={(e) => onChange(Number(e.target.value))}
          min={min}
          max={max}
          className={`w-full ${prefix ? 'pl-7' : 'pl-3'} ${suffix ? 'pr-14' : 'pr-3'} py-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition text-slate-900 font-semibold shadow-sm`}
        />
        {suffix && <span className="absolute right-3 text-slate-400 text-sm font-medium pointer-events-none">{suffix}</span>}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      <Navbar
        actions={[
          { type: "link", label: "Log in", href: "/login", className: "hidden md:inline-flex" },
          { type: "link", label: "Get started", href: "/signup", variant: "primary" },
        ]}
      />

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 py-12">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600 md:text-5xl tracking-tight">
            How much do you need to retire?
          </h1>
          <p className="text-lg text-slate-600 max-w-3xl mx-auto">
            This advanced calculator helps you plan the financial aspects of your retirement, giving you an idea of where you stand in terms of savings, your target, and what your retrievals will look like.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1.5fr_1fr] items-start">
          <div className="space-y-8">
            
            {/* Section 1 */}
            <section className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200">
              <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center text-white text-sm font-bold shadow-md">1</div>
                Basic Details
              </h2>
              <div className="space-y-1">
                <InputRow label="Your current age" value={currentAge} onChange={setCurrentAge} />
                <InputRow label="Your planned retirement age" value={plannedRetirementAge} onChange={setPlannedRetirementAge} />
                <InputRow label="Your life expectancy" value={lifeExpectancy} onChange={setLifeExpectancy} />
                <InputRow label="Your current pre-tax income" value={currentIncome} onChange={setCurrentIncome} prefix="$" suffix="/ year" />
              </div>
            </section>

            {/* Section 2 */}
            <section className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200">
              <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center text-white text-sm font-bold shadow-md">2</div>
                Assumptions
              </h2>
              <div className="space-y-1">
                <InputRow label="Your current income increase" value={incomeIncreaseRate} onChange={setIncomeIncreaseRate} suffix="% / yr" />
                <InputRow label="Income needed after retirement" value={incomeNeededPercent} onChange={setIncomeNeededPercent} suffix="% of inc" />
                <InputRow label="Average investment return" value={investmentReturnRate} onChange={setInvestmentReturnRate} suffix="% / yr" />
                <InputRow label="Inflation rate" value={inflationRate} onChange={setInflationRate} suffix="% / yr" />
              </div>
            </section>

            {/* Section 3 */}
            <section className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200">
              <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center text-white text-sm font-bold shadow-md">3</div>
                Optional Details
              </h2>
              <div className="space-y-1">
                <InputRow label="Other income after retirement (Social Security, etc.)" value={otherIncomeMonthly} onChange={setOtherIncomeMonthly} prefix="$" suffix="/ mo" />
                <InputRow label="Your current retirement savings" value={currentSavings} onChange={setCurrentSavings} prefix="$" />
                <InputRow label="Future retirement savings" value={futureSavingsPercent} onChange={setFutureSavingsPercent} suffix="% of inc" />
              </div>
            </section>
			
          </div>

          <div className="sticky top-24 bg-gradient-to-br from-slate-900 to-slate-800 p-8 rounded-3xl shadow-xl text-white flex flex-col gap-8 ring-1 ring-white/10 relative overflow-hidden">
            {/* Background embellishment */}
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-slate-700/30 rounded-full blur-3xl pointer-events-none"></div>

            <div className="relative z-10">
              <h2 className="text-lg font-medium text-slate-300 mb-2">Portfolio at Retirement</h2>
              <div className="text-5xl font-bold tracking-tight text-white mb-2">
                {formatCurrency(balanceAtRetirement)}
              </div>
              <p className="text-sm text-slate-400">At age {plannedRetirementAge}</p>
            </div>

            <div className="bg-white/5 rounded-2xl p-6 border border-white/10 space-y-4 relative z-10 backdrop-blur-sm">
               <div>
                 <span className="block text-sm text-slate-400 mb-2 uppercase tracking-wide font-semibold">Status Overview</span>
                 {ageDepleted ? (
                    <div className="text-red-400 font-semibold text-lg flex items-center gap-2">
                      <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                      Depletes at age {ageDepleted}
                    </div>
                 ) : (
                    <div className="text-emerald-400 font-semibold text-lg flex items-center gap-2">
                      <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      Lasts through life expectancy!
                    </div>
                 )}
               </div>

               <div className="pt-4 border-t border-white/10">
                 <div className="flex justify-between items-center py-2">
                   <span className="text-slate-300 text-sm">1st Year Est. Income</span>
                   <span className="font-semibold text-white">{formatCurrency(firstYearIncomeNeeded)}</span>
                 </div>
                 <div className="flex justify-between items-center py-2">
                   <span className="text-slate-300 text-sm">Final Balance (Age {lifeExpectancy})</span>
                   <span className={`font-semibold ${finalBalance > 0 ? "text-emerald-400" : "text-slate-400"}`}>
                     {formatCurrency(finalBalance)}
                   </span>
                 </div>
               </div>
            </div>

            <div className="p-5 bg-blue-500/10 rounded-2xl border border-blue-500/20 relative z-10">
              <p className="text-sm text-blue-200 leading-relaxed">
                <span className="font-semibold text-blue-300">Analysis: </span> 
                {ageDepleted ? 
                  "Your current plan shows a shortfall before life expectancy. Consider increasing savings, delaying retirement, lowering living expenses, or finding additional income sources to bridge the gap." 
                  : "Excellent! Your plan is on track to support you throughout your expected retirement given your current assumptions."}
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
