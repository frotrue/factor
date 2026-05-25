export function getWaveBriefingKey(nextWave: number, difficultyId: string): string {
    return `${nextWave}:${difficultyId}`;
}
