import React, { useState } from 'react';
import { Delete, HelpCircle } from 'lucide-react';
import { verifyPIN } from '../utils/security';

interface CalculatorScreenProps {
  onUnlockSecret: () => void;
}

export const CalculatorScreen: React.FC<CalculatorScreenProps> = ({ onUnlockSecret }) => {
  const [display, setDisplay] = useState('0');
  const [equation, setEquation] = useState('');
  const [history, setHistory] = useState('');
  const [waitingForOperand, setWaitingForOperand] = useState(false);
  const [prevValue, setPrevValue] = useState<number | null>(null);
  const [operator, setOperator] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(false);

  const handleDigit = (digit: string) => {
    if (waitingForOperand) {
      setDisplay(digit);
      setWaitingForOperand(false);
    } else {
      setDisplay(display === '0' ? digit : display + digit);
    }
  };

  const handleDecimal = () => {
    if (waitingForOperand) {
      setDisplay('0.');
      setWaitingForOperand(false);
    } else if (!display.includes('.')) {
      setDisplay(display + '.');
    }
  };

  const handleClear = () => {
    setDisplay('0');
    setEquation('');
    setPrevValue(null);
    setOperator(null);
    setWaitingForOperand(false);
  };

  const handleDelete = () => {
    if (waitingForOperand) return;
    if (display.length > 1) {
      setDisplay(display.slice(0, -1));
    } else {
      setDisplay('0');
    }
  };

  const handleToggleSign = () => {
    const val = parseFloat(display);
    if (!isNaN(val)) {
      setDisplay((val * -1).toString());
    }
  };

  const handlePercent = () => {
    const val = parseFloat(display);
    if (!isNaN(val)) {
      setDisplay((val / 100).toString());
    }
  };

  const handleOperator = (nextOp: string) => {
    const inputValue = parseFloat(display);

    if (prevValue === null) {
      setPrevValue(inputValue);
    } else if (operator && !waitingForOperand) {
      const result = calculate(prevValue, inputValue, operator);
      setPrevValue(result);
      setDisplay(String(result));
    }

    setWaitingForOperand(true);
    setOperator(nextOp);
    setEquation(`${display} ${nextOp}`);
  };

  const calculate = (a: number, b: number, op: string): number => {
    switch (op) {
      case '+': return a + b;
      case '-': return a - b;
      case '×': return a * b;
      case '÷': return b !== 0 ? a / b : 0;
      default: return b;
    }
  };

  const handleEqual = async () => {
    const trimmedInput = display.trim();

    // Check SECRET CODE: dynamic verification via verifyPIN
    // Defaults to 2580 or matches custom owner-configured PIN
    const isSecretMatch = await verifyPIN(trimmedInput);
    if (isSecretMatch || (prevValue !== null && (await verifyPIN(String(prevValue))) && waitingForOperand)) {
      onUnlockSecret();
      return;
    }

    const inputValue = parseFloat(display);

    if (operator && prevValue !== null) {
      const result = calculate(prevValue, inputValue, operator);
      setHistory(`${prevValue} ${operator} ${inputValue} =`);
      setDisplay(String(result));
      setPrevValue(null);
      setOperator(null);
      setEquation('');
      setWaitingForOperand(true);
    }
  };

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto bg-[#17171c] text-white px-5 py-6 select-none justify-between">
      {/* Top Header / Subtle Status Bar */}
      <div className="flex justify-between items-center text-slate-400 text-xs px-2 pt-2">
        <div className="flex items-center gap-1">
          <span className="font-semibold tracking-wider text-slate-300">DEG</span>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowHint(!showHint)}
            className="p-1 rounded-full text-slate-400 hover:text-slate-200 transition-colors"
            title="Calculator Info"
          >
            <HelpCircle size={18} />
          </button>
        </div>
      </div>

      {showHint && (
        <div className="bg-slate-800/95 border border-slate-700 text-slate-200 text-xs rounded-xl p-3 shadow-lg mx-2 my-1 animate-in fade-in slide-in-from-top-2">
          <p className="font-medium text-rose-300 mb-1">Calculator Disguise System</p>
          <p className="text-slate-300 leading-relaxed">
            Enter passcode <span className="font-bold text-white bg-slate-700 px-1.5 py-0.5 rounded tracking-widest">2580</span> and press <span className="font-bold text-white bg-blue-600 px-1.5 py-0.5 rounded">=</span> to open the private messaging interface.
          </p>
        </div>
      )}

      {/* Main Display Area */}
      <div className="flex flex-col justify-end items-end px-3 py-6 flex-1 min-h-[140px]">
        <div className="text-slate-400 text-sm font-light h-6 tracking-wide mb-1">
          {history || equation || ''}
        </div>
        <div 
          className="text-white font-light tracking-tight transition-all duration-150 overflow-hidden text-right w-full"
          style={{ 
            fontSize: display.length > 10 ? '2.5rem' : display.length > 7 ? '3.5rem' : '4.5rem' 
          }}
        >
          {display}
        </div>
      </div>

      {/* Keypad Grid */}
      <div className="grid grid-cols-4 gap-3.5 pb-4">
        {/* Row 1 */}
        <button 
          onClick={handleClear}
          className="h-16 rounded-2xl bg-[#4e505f] hover:bg-[#5f6274] active:scale-95 text-lg font-medium transition-all shadow-md"
        >
          C
        </button>
        <button 
          onClick={handleToggleSign}
          className="h-16 rounded-2xl bg-[#4e505f] hover:bg-[#5f6274] active:scale-95 text-lg font-medium transition-all shadow-md"
        >
          +/-
        </button>
        <button 
          onClick={handlePercent}
          className="h-16 rounded-2xl bg-[#4e505f] hover:bg-[#5f6274] active:scale-95 text-lg font-medium transition-all shadow-md"
        >
          %
        </button>
        <button 
          onClick={() => handleOperator('÷')}
          className={`h-16 rounded-2xl active:scale-95 text-xl font-medium transition-all shadow-md ${
            operator === '÷' ? 'bg-white text-[#4b5efc]' : 'bg-[#4b5efc] hover:bg-[#5b6dfc] text-white'
          }`}
        >
          ÷
        </button>

        {/* Row 2 */}
        <button 
          onClick={() => handleDigit('7')}
          className="h-16 rounded-2xl bg-[#2e2f38] hover:bg-[#3a3c47] active:scale-95 text-2xl font-normal transition-all shadow-md"
        >
          7
        </button>
        <button 
          onClick={() => handleDigit('8')}
          className="h-16 rounded-2xl bg-[#2e2f38] hover:bg-[#3a3c47] active:scale-95 text-2xl font-normal transition-all shadow-md"
        >
          8
        </button>
        <button 
          onClick={() => handleDigit('9')}
          className="h-16 rounded-2xl bg-[#2e2f38] hover:bg-[#3a3c47] active:scale-95 text-2xl font-normal transition-all shadow-md"
        >
          9
        </button>
        <button 
          onClick={() => handleOperator('×')}
          className={`h-16 rounded-2xl active:scale-95 text-xl font-medium transition-all shadow-md ${
            operator === '×' ? 'bg-white text-[#4b5efc]' : 'bg-[#4b5efc] hover:bg-[#5b6dfc] text-white'
          }`}
        >
          ×
        </button>

        {/* Row 3 */}
        <button 
          onClick={() => handleDigit('4')}
          className="h-16 rounded-2xl bg-[#2e2f38] hover:bg-[#3a3c47] active:scale-95 text-2xl font-normal transition-all shadow-md"
        >
          4
        </button>
        <button 
          onClick={() => handleDigit('5')}
          className="h-16 rounded-2xl bg-[#2e2f38] hover:bg-[#3a3c47] active:scale-95 text-2xl font-normal transition-all shadow-md"
        >
          5
        </button>
        <button 
          onClick={() => handleDigit('6')}
          className="h-16 rounded-2xl bg-[#2e2f38] hover:bg-[#3a3c47] active:scale-95 text-2xl font-normal transition-all shadow-md"
        >
          6
        </button>
        <button 
          onClick={() => handleOperator('-')}
          className={`h-16 rounded-2xl active:scale-95 text-xl font-medium transition-all shadow-md ${
            operator === '-' ? 'bg-white text-[#4b5efc]' : 'bg-[#4b5efc] hover:bg-[#5b6dfc] text-white'
          }`}
        >
          -
        </button>

        {/* Row 4 */}
        <button 
          onClick={() => handleDigit('1')}
          className="h-16 rounded-2xl bg-[#2e2f38] hover:bg-[#3a3c47] active:scale-95 text-2xl font-normal transition-all shadow-md"
        >
          1
        </button>
        <button 
          onClick={() => handleDigit('2')}
          className="h-16 rounded-2xl bg-[#2e2f38] hover:bg-[#3a3c47] active:scale-95 text-2xl font-normal transition-all shadow-md"
        >
          2
        </button>
        <button 
          onClick={() => handleDigit('3')}
          className="h-16 rounded-2xl bg-[#2e2f38] hover:bg-[#3a3c47] active:scale-95 text-2xl font-normal transition-all shadow-md"
        >
          3
        </button>
        <button 
          onClick={() => handleOperator('+')}
          className={`h-16 rounded-2xl active:scale-95 text-xl font-medium transition-all shadow-md ${
            operator === '+' ? 'bg-white text-[#4b5efc]' : 'bg-[#4b5efc] hover:bg-[#5b6dfc] text-white'
          }`}
        >
          +
        </button>

        {/* Row 5 */}
        <button 
          onClick={handleDelete}
          className="h-16 rounded-2xl bg-[#2e2f38] hover:bg-[#3a3c47] active:scale-95 flex items-center justify-center transition-all shadow-md"
          title="Backspace"
        >
          <Delete size={22} className="text-slate-300" />
        </button>
        <button 
          onClick={() => handleDigit('0')}
          className="h-16 rounded-2xl bg-[#2e2f38] hover:bg-[#3a3c47] active:scale-95 text-2xl font-normal transition-all shadow-md"
        >
          0
        </button>
        <button 
          onClick={handleDecimal}
          className="h-16 rounded-2xl bg-[#2e2f38] hover:bg-[#3a3c47] active:scale-95 text-2xl font-normal transition-all shadow-md"
        >
          .
        </button>
        <button 
          onClick={handleEqual}
          className="h-16 rounded-2xl bg-[#4b5efc] hover:bg-[#5b6dfc] active:scale-95 text-2xl font-medium transition-all shadow-lg text-white"
        >
          =
        </button>
      </div>
    </div>
  );
};
