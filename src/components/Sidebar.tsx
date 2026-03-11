import type { Player } from '../logic/types';

interface SidebarProps {
    players: Player[];
    currentPlayerIndex: number;
    bank: Record<string, number>;
}

const Sidebar: React.FC<SidebarProps> = ({ players, currentPlayerIndex, bank }) => {
    // Sort bank by balance for the leaderboard
    const bankList = Object.entries(bank)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10);

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
                fontSize: '18px',
                marginBottom: '15px',
                textAlign: 'center',
                borderBottom: '1px solid #333',
                paddingBottom: '10px',
                letterSpacing: 1
            }}>
                🏦 BANKROLLS
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '30px' }}>
                {bankList.length === 0 ? (
                    <div style={{ color: '#555', textAlign: 'center', fontSize: 12 }}>No bank records yet.</div>
                ) : (
                    bankList.map(([id, balance], idx) => {
                        const seatedPlayer = players.find(p => p.ownerId === id);
                        return (
                            <div key={id} style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                fontSize: '13px',
                                color: seatedPlayer ? '#f1c40f' : '#bdc3c7',
                                background: seatedPlayer ? 'rgba(241, 196, 15, 0.1)' : 'transparent',
                                padding: '4px 8px',
                                borderRadius: '4px'
                            }}>
                                <span style={{ fontWeight: seatedPlayer ? 'bold' : 'normal' }}>
                                    {idx + 1}. {seatedPlayer ? seatedPlayer.name : 'Unknown User'}
                                </span>
                                <span>💩 {balance.toLocaleString()}</span>
                            </div>
                        );
                    })
                )}
            </div>

            <h2 style={{
                color: '#f1c40f',
                fontSize: '18px',
                marginBottom: '15px',
                textAlign: 'center',
                borderBottom: '1px solid #333',
                paddingBottom: '10px',
                letterSpacing: 1
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
                <div style={{ color: '#eee', fontSize: '18px', fontWeight: 'bold', display: 'flex', justifyContent: 'center', gap: '10px' }}>
                    <span>VISA</span>
                    <span>TNG</span>
                    <span>PAYPAL</span>
                </div>
            </div>
        </div>
    );
};

export default Sidebar;
