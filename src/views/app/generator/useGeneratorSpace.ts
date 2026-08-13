import { useCallback, useEffect, useState } from 'react';
import { apiGetGeneratorSpace } from '@/services/GeneratorServices';
import type { GeneratorSpace } from '@/@types/generator';

/**
 * Charge l'espace du Générateur connecté (`GET /referral/me`).
 *
 * Le périmètre est calculé côté serveur à partir du JWT : aucun identifiant
 * n'est envoyé par le client, un générateur ne peut donc jamais voir les
 * données d'un autre.
 */
export function useGeneratorSpace() {
    const [space, setSpace] = useState<GeneratorSpace | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            setSpace(await apiGetGeneratorSpace());
        } catch (err: any) {
            console.error('[Generator] Échec chargement de l\'espace Générateur:', err);
            setError(
                err?.response?.data?.error?.message ||
                    'Impossible de charger vos données de parrainage.'
            );
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    return { space, loading, error, reload: load };
}

export default useGeneratorSpace;
