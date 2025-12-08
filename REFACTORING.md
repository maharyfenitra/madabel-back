# Backend Refactoring - MADABEL

## 📋 Vue d'ensemble

Le backend a été refactoré pour améliorer la maintenabilité, réduire la duplication de code et suivre les meilleures pratiques.

## 🏗️ Structure

```
back/src/
├── utils/
│   ├── helpers/          # Fonctions utilitaires réutilisables
│   │   ├── auth.ts       # Helpers d'authentification et autorisation
│   │   ├── errorHandler.ts  # Gestion standardisée des erreurs
│   │   ├── evaluation.ts # Helpers spécifiques aux évaluations
│   │   ├── pagination.ts # Gestion de la pagination
│   │   ├── validation.ts # Validation des données
│   │   └── index.ts      # Export central
│   ├── services/         # Services réutilisables
│   │   ├── emailService.ts  # Service d'envoi d'emails
│   │   └── index.ts
│   └── index.ts          # Export principal
└── modules/
    ├── auths/
    ├── evaluations/
    ├── users/
    └── ...
```

## 🎯 Améliorations principales

### 1. Helpers de pagination

**Avant :**
```typescript
let page = q && q.page ? parseInt(String(q.page), 10) : 1;
let limit = q && q.limit ? parseInt(String(q.limit), 10) : 10;
if (isNaN(page) || page < 1) page = 1;
if (isNaN(limit) || limit < 1) limit = 10;
const MAX_LIMIT = 100;
if (limit > MAX_LIMIT) limit = MAX_LIMIT;
const skip = (page - 1) * limit;
```

**Après :**
```typescript
const { page, limit, skip } = parsePaginationParams(request.query);
```

### 2. Gestion des erreurs

**Avant :**
```typescript
return reply.status(500).send({
  error: "Erreur interne du serveur",
  ...(process.env.NODE_ENV === 'development' && { details: error.message }),
});
```

**Après :**
```typescript
return sendInternalError(reply, "Message d'erreur", error);
```

### 3. Enrichissement des données

**Avant :**
```typescript
const enrichedEvaluations = evaluations.map((evaluation) => {
  const evaluators = evaluation.participants.filter(
    (p) => p.participantRole === "EVALUATOR"
  );
  const completedEvaluators = evaluators.filter(
    (e) => e.completedAt !== null
  ).length;
  return {
    ...evaluation,
    evaluatorsCount: evaluators.length,
    completedEvaluators,
  };
});
```

**Après :**
```typescript
const enrichedEvaluations = enrichEvaluationsData(evaluations);
```

### 4. Authentication helpers

**Avant :**
```typescript
const user = (request as any)?.user as { userId: number; role: string };
if (!user) {
  return reply.status(401).send({ error: "Utilisateur non authentifié" });
}
```

**Après :**
```typescript
const user = getAuthenticatedUser(request);
if (!user) {
  return sendUnauthorized(reply);
}
```

## 📚 Utilisation des helpers

### Pagination

```typescript
import { parsePaginationParams, createPaginatedResponse } from "../../../utils";

const { page, limit, skip } = parsePaginationParams(request.query);

// ... fetch data ...

return reply.send(
  createPaginatedResponse(data, total, page, limit, 'dataKey')
);
```

### Gestion des erreurs

```typescript
import { 
  sendBadRequest, 
  sendNotFound, 
  sendUnauthorized,
  sendInternalError 
} from "../../../utils";

// Bad Request (400)
if (!isValid) {
  return sendBadRequest(reply, "Données invalides");
}

// Not Found (404)
if (!resource) {
  return sendNotFound(reply, "Ressource non trouvée");
}

// Unauthorized (401)
if (!user) {
  return sendUnauthorized(reply);
}

// Internal Server Error (500)
try {
  // ...
} catch (error) {
  return sendInternalError(reply, "Message d'erreur", error);
}
```

### Validation

```typescript
import { parseId, validateRequiredFields, isValidEmail } from "../../../utils";

// Validate and parse ID
const userId = parseId(params.id);
if (!userId) {
  return sendBadRequest(reply, "ID invalide");
}

// Validate required fields
const { valid, missing } = validateRequiredFields(data, ['name', 'email']);
if (!valid) {
  return sendBadRequest(reply, `Champs manquants: ${missing.join(', ')}`);
}

// Validate email
if (!isValidEmail(email)) {
  return sendBadRequest(reply, "Email invalide");
}
```

### Authentication & Authorization

```typescript
import { 
  getAuthenticatedUser, 
  isAdmin, 
  canAccessResource 
} from "../../../utils";

const user = getAuthenticatedUser(request);
if (!user) {
  return sendUnauthorized(reply);
}

// Check if admin
if (isAdmin(user)) {
  // Admin-specific logic
}

// Check resource access
if (!canAccessResource(user, resourceUserId)) {
  return sendForbidden(reply, "Accès non autorisé");
}
```

### Evaluation helpers

```typescript
import { 
  enrichEvaluationsData,
  getCandidatFromParticipants,
  calculateEvaluationProgress 
} from "../../../utils";

// Enrich single or multiple evaluations
const enriched = enrichEvaluationsData(evaluations);

// Get candidat from participants
const candidat = getCandidatFromParticipants(evaluation.participants);

// Calculate progress
const progress = calculateEvaluationProgress(evaluation.participants);
// Returns: { evaluatorsCount, completedEvaluators, progressPercentage }
```

### Email service

```typescript
import { sendEmail, createPasswordResetEmail } from "../../../utils";

// Send password reset email
const { subject, text, html } = createPasswordResetEmail(
  user.name,
  resetLink,
  15 // expires in 15 minutes
);

const sent = await sendEmail({
  to: user.email,
  subject,
  text,
  html,
});

if (!sent) {
  return sendInternalError(reply, "Erreur lors de l'envoi de l'email");
}
```

## 🔍 Fichiers refactorés

- ✅ `handleFindEvaluations.ts` - Pagination et enrichissement
- ✅ `handleFindUsers.ts` - Pagination standardisée
- ✅ `handleGetAllReports.ts` - Auth, pagination, enrichissement
- ✅ `handleFindUserById.ts` - Validation et gestion d'erreurs
- ✅ `handleDeleteUser.ts` - Validation ID et erreurs
- ✅ `handleFindQuizById.ts` - Validation et erreurs
- ✅ `handleFindQuizzes.ts` - Gestion d'erreurs
- ✅ `handleFindAllParticipants.ts` - Validation et erreurs

## 🎨 Principes de code

1. **DRY (Don't Repeat Yourself)** - Utiliser les helpers pour éviter la duplication
2. **Single Responsibility** - Chaque fonction a une responsabilité claire
3. **Consistent Error Handling** - Gestion d'erreurs standardisée
4. **Type Safety** - Types TypeScript pour tous les helpers
5. **Maintainability** - Code facile à lire et à maintenir

## 🚀 Prochaines étapes

- [ ] Refactorer les handlers d'authentification
- [ ] Refactorer les handlers de création/mise à jour
- [ ] Ajouter des tests unitaires pour les helpers
- [ ] Documenter les endpoints API
- [ ] Ajouter des middlewares de validation

## 📖 Documentation

Tous les helpers sont documentés avec JSDoc. Utilisez l'autocomplétion de votre IDE pour voir les descriptions et types.

## 🤝 Contribution

Lors de l'ajout de nouveaux handlers :
1. Utilisez les helpers existants autant que possible
2. Créez de nouveaux helpers si nécessaire pour éviter la duplication
3. Suivez les patterns établis pour la cohérence
4. Documentez les nouvelles fonctions avec JSDoc
