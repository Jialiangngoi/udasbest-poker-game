import React from 'react';
import type { CardModel } from '../logic/types';
import { SuitSymbols, SuitIsRed, RankLabels } from '../logic/types';

interface CardProps {
    card?: CardModel;
    isFaceUp?: boolean;
    width?: number;
}

const Card: React.FC<CardProps> = ({ card, isFaceUp = true, width = 60 }) => {
    const height = width * 1.4;

    const cardStyle: React.CSSProperties = {
        width,
        height,
        position: 'relative',
        transition: 'transform 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.5s ease',
        transformStyle: 'preserve-3d',
        transform: isFaceUp ? 'rotateY(0deg)' : 'rotateY(180deg)',
        animation: 'dealIn 0.5s ease-out forwards',
    };

    const backSide: React.CSSProperties = {
        position: 'absolute',
        inset: 0,
        backgroundColor: '#2c3e50',
        borderRadius: 8,
        border: '2px solid rgba(255,255,255,0.2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backfaceVisibility: 'hidden',
        transform: 'rotateY(180deg)',
        boxShadow: '0 4px 8px rgba(0,0,0,0.4)',
        background: 'repeating-linear-gradient(45deg, #2c3e50, #2c3e50 10px, #34495e 10px, #34495e 20px)'
    };

    const frontSide: React.CSSProperties = {
        position: 'absolute',
        inset: 0,
        backgroundColor: 'white',
        borderRadius: 8,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: width * 0.1,
        backfaceVisibility: 'hidden',
        boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
        userSelect: 'none'
    };

    if (!card) {
        return (
            <div
                style={{
                    width,
                    height,
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    borderRadius: 8,
                    border: '2px dashed rgba(255,255,255,0.1)'
                }}
            />
        );
    }

    const isRed = SuitIsRed[card.suit];
    const color = isRed ? '#e74c3c' : '#2c3e50';

    return (
        <div className="card-outer" style={cardStyle}>
            {/* FRONT */}
            <div style={{ ...frontSide, color }}>
                <div style={{ fontSize: width * 0.25, fontWeight: 'bold', lineHeight: 1 }}>
                    {RankLabels[card.rank]}
                </div>
                <div style={{ fontSize: width * 0.2, alignSelf: 'flex-start', marginTop: -2 }}>
                    {SuitSymbols[card.suit]}
                </div>

                <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    fontSize: width * 0.5,
                    opacity: 0.1
                }}>
                    {SuitSymbols[card.suit]}
                </div>

                <div style={{ transform: 'rotate(180deg)', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                    <div style={{ fontSize: width * 0.25, fontWeight: 'bold', lineHeight: 1 }}>
                        {RankLabels[card.rank]}
                    </div>
                    <div style={{ fontSize: width * 0.2, marginTop: -2 }}>
                        {SuitSymbols[card.suit]}
                    </div>
                </div>
            </div>

            {/* BACK */}
            <div style={backSide}>
                <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: width * 0.4 }}>♠</div>
            </div>
        </div>
    );
};

export default Card;
