
import React from 'react';

interface NorthIndianChartProps {
  data: Array<{ house: number; planets: string[]; sign: number }>;
}

export const NorthIndianChart: React.FC<NorthIndianChartProps> = ({ data }) => {
  if (!data || data.length === 0) return null;

  return (
    <div className="relative w-full aspect-square max-w-[340px] mx-auto bg-white/50 border border-[#A27E1D]/20 rounded-2xl p-4 shadow-sm">
      <svg viewBox="0 0 400 400" className="w-full h-full">
        {/* Outer Frame */}
        <rect x="0" y="0" width="400" height="400" fill="none" stroke="#A27E1D" strokeWidth="2" strokeOpacity="0.4" />
        
        {/* Diagonal lines */}
        <line x1="0" y1="0" x2="400" y2="400" stroke="#A27E1D" strokeWidth="1" strokeOpacity="0.2" />
        <line x1="400" y1="0" x2="0" y2="400" stroke="#A27E1D" strokeWidth="1" strokeOpacity="0.2" />
        
        {/* Inner Diamond */}
        <path d="M 200 0 L 400 200 L 200 400 L 0 200 Z" fill="none" stroke="#A27E1D" strokeWidth="1.5" strokeOpacity="0.3" />

        {/* House Content Mapping */}
        <HouseContent x={200} y={110} data={data[0]} houseNum={1} isCenter />
        <HouseContent x={110} y={60} data={data[1]} houseNum={2} />
        <HouseContent x={60} y={110} data={data[2]} houseNum={3} />
        <HouseContent x={110} y={200} data={data[3]} houseNum={4} isCenter />
        <HouseContent x={60} y={290} data={data[4]} houseNum={5} />
        <HouseContent x={110} y={340} data={data[5]} houseNum={6} />
        <HouseContent x={200} y={290} data={data[6]} houseNum={7} isCenter />
        <HouseContent x={290} y={340} data={data[7]} houseNum={8} />
        <HouseContent x={340} y={290} data={data[8]} houseNum={9} />
        <HouseContent x={290} y={200} data={data[9]} houseNum={10} isCenter />
        <HouseContent x={340} y={110} data={data[10]} houseNum={11} />
        <HouseContent x={290} y={60} data={data[11]} houseNum={12} />
      </svg>
    </div>
  );
};

const HouseContent = ({ x, y, data, houseNum, isCenter }: { x: number; y: number; data: any; houseNum: number; isCenter?: boolean }) => (
  <g className="cursor-default">
    {/* Sign Number */}
    <text x={x} y={y - 14} textAnchor="middle" className={`font-bold ${isCenter ? 'fill-[#854D0E] text-xl' : 'fill-slate-400 text-sm'}`}>
      {data?.sign}
    </text>
    {/* Planets */}
    <text x={x} y={y + 10} textAnchor="middle" className="fill-slate-800 font-bold text-[12px]" style={{ letterSpacing: '0.5px' }}>
      {data?.planets?.join(' ')}
    </text>
  </g>
);
