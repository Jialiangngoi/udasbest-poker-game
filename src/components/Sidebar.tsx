import React from 'react';
import type { Player } from '../logic/types';

interface SidebarProps {
    players: Player[];
    currentPlayerIndex: number;
}

const Sidebar: React.FC<SidebarProps> = ({ players, currentPlayerIndex }) => {
    return (
        <div className="sidebar-container" style={{
            backgroundColor: '#1a1a1a',
            borderLeft: '2px solid #2c1810',
            display: 'flex',
            flexDirection: 'column',
            padding: '20px',
            overflowY: 'auto',
            boxSizing: 'border-box'
        }}>
            <h2 style={{
                color: '#f1c40f',
                fontSize: '20px',
                marginBottom: '20px',
                textAlign: 'center',
                borderBottom: '1px solid #333',
                paddingBottom: '10px'
            }}>
                TABLE STATUS
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {players.map((player, index) => (
                    <div key={player.id} style={{
                        padding: '12px',
                        borderRadius: '8px',
                        backgroundColor: player.isSeated ? (index === currentPlayerIndex ? '#27ae60' : '#2c3e50') : 'rgba(255,255,255,0.05)',
                        border: index === currentPlayerIndex ? '2px solid #2ecc71' : '1px solid transparent',
                        opacity: player.isFolded ? 0.6 : 1,
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                {player.isSeated && (
                                    <div style={{
                                        width: 24,
                                        height: 24,
                                        borderRadius: '50%',
                                        backgroundColor: '#1a1a1a',
                                        overflow: 'hidden',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: 14,
                                        border: '1px solid rgba(255,255,255,0.2)'
                                    }}>
                                        {player.avatarUrl ? <img src={player.avatarUrl} alt="v" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '👤'}
                                    </div>
                                )}
                                <span style={{
                                    fontWeight: 'bold',
                                    color: player.isSeated ? 'white' : '#777',
                                    fontSize: '14px'
                                }}>
                                    {player.isSeated ? player.name : `Seat ${index + 1}`}
                                </span>
                            </div>
                            {player.isSeated && (
                                <span style={{ fontSize: '10px', color: '#f1c40f' }}>{player.title}</span>
                            )}
                        </div>

                        {player.isSeated ? (
                            <>
                                <div style={{ fontSize: '12px', color: '#bdc3c7' }}>
                                    💩 {player.chips.toLocaleString()}
                                </div>
                                {player.isFolded && (
                                    <div style={{ fontSize: '10px', color: '#e74c3c', fontWeight: 'bold' }}>FOLDED</div>
                                )}
                            </>
                        ) : (
                            <div style={{ fontSize: '12px', color: '#555', fontStyle: 'italic' }}>Empty Slot</div>
                        )}
                    </div>
                ))}
            </div>
            <div style={{ marginTop: 'auto', paddingTop: '20px', textAlign: 'center' }}>
                <p style={{ fontSize: '10px', color: '#555', marginBottom: '8px', letterSpacing: '1px' }}>SECURE PAYMENTS BY</p>
                <img
                    src="/src/assets/partners.png"
                    alt="Logo"
                    style={{ width: '100%', maxWidth: '180px', opacity: 0.6, filter: 'grayscale(100%) brightness(1.5)' }}
                />
            </div>
        </div>
    );
};

export default Sidebar;
