# Skill : Qualité de code & Anti-erreurs

## Avant de coder quoi que ce soit

1. **Lire CLAUDE.md** en entier
2. **Identifier le repository** concerné (peg_strapi ou PEG_FRONTEND)
3. **Vérifier l'environnement cible** (dev, intégration, prod)
4. **Utiliser Sequential Thinking** pour décomposer la tâche en étapes avant d'écrire la moindre ligne

## Règles de qualité strictes

### ❌ Interdit
- Hardcoder une URL, clé API ou secret dans le code
- Modifier directement la BDD de production
- Pusher sur `main` sans avoir testé sur intégration
- Supprimer des variables d'environnement inconnues sans investigation
- Créer un nouveau composant/service si un existant peut être réutilisé

### ✅ Obligatoire
- Variables d'environnement pour TOUT ce qui est config/secret
- Tester chaque feature sur intégration avant prod
- Vérifier que le build Heroku est OK après chaque déploiement backend
- Commenter les parties complexes du code
- Vérifier les CORS S3 si on ajoute un nouveau domaine

## Checklist avant chaque commit

- [ ] Aucune clé/secret hardcodé
- [ ] Code testé en local
- [ ] Pas de `console.log` de debug oublié
- [ ] Les variables d'environnement nécessaires sont documentées
- [ ] Le comportement a été vérifié sur intégration

## Checklist avant chaque mise en production

- [ ] Testé sur https://int.mypeg.fr
- [ ] Backend build OK sur peg-int
- [ ] Stripe fonctionne en mode test
- [ ] Aucune régression visible
- [ ] Backup BDD récent disponible sur S3
