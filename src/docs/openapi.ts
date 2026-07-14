import type { OpenAPIV3 } from 'openapi-types'

export const openApiSpec: OpenAPIV3.Document = {
  openapi: '3.0.3',
  info: {
    title: 'Top Teaser API',
    version: '0.1.0',
    description: 'API MVP pour la plateforme d envoi de mails en masse.',
  },
  servers: [
    {
      url: 'http://localhost:4000',
      description: 'Local development',
    },
  ],
  tags: [
    {
      name: 'Auth',
      description: 'Authentification administrateur',
    },
    {
      name: 'Health',
      description: 'Etat du service',
    },
    {
      name: 'Contacts',
      description: 'Gestion des contacts',
    },
    {
      name: 'Contact Lists',
      description: 'Gestion des listes de contacts',
    },
    {
      name: 'Imports',
      description: 'Import de donnees depuis des fichiers',
    },
    {
      name: 'Templates',
      description: 'Gestion des templates email',
    },
    {
      name: 'Campaigns',
      description: 'Gestion des campagnes email',
    },
    {
      name: 'Email Logs',
      description: 'Journal des envois email',
    },
    {
      name: 'Mail',
      description: 'Providers email et diagnostics',
    },
    {
      name: 'Webhooks',
      description: 'Reception des evenements providers email',
    },
    {
      name: 'Unsubscribes',
      description: 'Desabonnement public',
    },
    {
      name: 'Suppressions',
      description: 'Liste d exclusion email',
    },
  ],
  paths: {
    '/api/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Connecter un administrateur',
        description:
          'Verifie les identifiants admin et retourne un token Bearer JWT.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/LoginRequest',
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Connexion reussie',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/AuthSessionResponse',
                },
              },
            },
          },
          '401': {
            description: 'Identifiants invalides',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
              },
            },
          },
          '422': {
            description: 'Donnees invalides',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ValidationErrorResponse',
                },
              },
            },
          },
        },
      },
    },
    '/api/auth/logout': {
      post: {
        tags: ['Auth'],
        summary: 'Deconnecter l administrateur courant',
        description:
          'Avec JWT stateless, le client supprime le token. Cette route confirme la deconnexion cote API.',
        security: [
          {
            bearerAuth: [],
          },
        ],
        responses: {
          '200': {
            description: 'Deconnexion confirmee',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/MessageResponse',
                },
              },
            },
          },
          '401': {
            description: 'Token manquant ou invalide',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
              },
            },
          },
        },
      },
    },
    '/api/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Afficher l administrateur connecte',
        security: [
          {
            bearerAuth: [],
          },
        ],
        responses: {
          '200': {
            description: 'Utilisateur courant',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/CurrentUserResponse',
                },
              },
            },
          },
          '401': {
            description: 'Token manquant ou invalide',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
              },
            },
          },
        },
      },
    },
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Verifier que l API est disponible',
        responses: {
          '200': {
            description: 'API disponible',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/HealthResponse',
                },
              },
            },
          },
        },
      },
    },
    '/api/contacts': {
      get: {
        tags: ['Contacts'],
        summary: 'Lister les contacts',
        security: [
          {
            bearerAuth: [],
          },
        ],
        responses: {
          '200': {
            description: 'Liste des contacts',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ContactCollectionResponse',
                },
              },
            },
          },
          '401': {
            description: 'Token manquant ou invalide',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Contacts'],
        summary: 'Creer un contact',
        security: [
          {
            bearerAuth: [],
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/CreateContactRequest',
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Contact cree',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ContactResponse',
                },
              },
            },
          },
          '401': {
            description: 'Token manquant ou invalide',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
              },
            },
          },
          '409': {
            description: 'Email deja utilise par un autre contact',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
              },
            },
          },
          '422': {
            description: 'Donnees invalides',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ValidationErrorResponse',
                },
              },
            },
          },
        },
      },
    },
    '/api/contacts/{id}': {
      get: {
        tags: ['Contacts'],
        summary: 'Afficher un contact',
        security: [
          {
            bearerAuth: [],
          },
        ],
        parameters: [
          {
            $ref: '#/components/parameters/ContactId',
          },
        ],
        responses: {
          '200': {
            description: 'Contact trouve',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ContactResponse',
                },
              },
            },
          },
          '401': {
            description: 'Token manquant ou invalide',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
              },
            },
          },
          '404': {
            description: 'Contact introuvable',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
              },
            },
          },
        },
      },
      patch: {
        tags: ['Contacts'],
        summary: 'Modifier un contact',
        security: [
          {
            bearerAuth: [],
          },
        ],
        parameters: [
          {
            $ref: '#/components/parameters/ContactId',
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/UpdateContactRequest',
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Contact modifie',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ContactResponse',
                },
              },
            },
          },
          '401': {
            description: 'Token manquant ou invalide',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
              },
            },
          },
          '404': {
            description: 'Contact introuvable',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
              },
            },
          },
          '409': {
            description: 'Email deja utilise par un autre contact',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
              },
            },
          },
          '422': {
            description: 'Donnees invalides',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ValidationErrorResponse',
                },
              },
            },
          },
        },
      },
      delete: {
        tags: ['Contacts'],
        summary: 'Supprimer un contact',
        security: [
          {
            bearerAuth: [],
          },
        ],
        parameters: [
          {
            $ref: '#/components/parameters/ContactId',
          },
        ],
        responses: {
          '204': {
            description: 'Contact supprime',
          },
          '401': {
            description: 'Token manquant ou invalide',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
              },
            },
          },
          '404': {
            description: 'Contact introuvable',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
              },
            },
          },
        },
      },
    },
    '/api/contact-lists': {
      get: {
        tags: ['Contact Lists'],
        summary: 'Lister les listes de contacts',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Listes de contacts',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ContactListCollectionResponse',
                },
              },
            },
          },
          '401': {
            description: 'Token manquant ou invalide',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
      post: {
        tags: ['Contact Lists'],
        summary: 'Creer une liste de contacts',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/CreateContactListRequest',
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Liste creee',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ContactListResponse' },
              },
            },
          },
          '401': {
            description: 'Token manquant ou invalide',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          '422': {
            description: 'Donnees invalides',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ValidationErrorResponse',
                },
              },
            },
          },
        },
      },
    },
    '/api/contact-lists/{id}': {
      get: {
        tags: ['Contact Lists'],
        summary: 'Afficher une liste de contacts',
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/ContactListId' }],
        responses: {
          '200': {
            description: 'Liste trouvee',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ContactListResponse' },
              },
            },
          },
          '401': {
            description: 'Token manquant ou invalide',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          '404': {
            description: 'Liste introuvable',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
      patch: {
        tags: ['Contact Lists'],
        summary: 'Modifier une liste de contacts',
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/ContactListId' }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/UpdateContactListRequest',
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Liste modifiee',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ContactListResponse' },
              },
            },
          },
          '401': {
            description: 'Token manquant ou invalide',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          '404': {
            description: 'Liste introuvable',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          '422': {
            description: 'Donnees invalides',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ValidationErrorResponse',
                },
              },
            },
          },
        },
      },
      delete: {
        tags: ['Contact Lists'],
        summary: 'Supprimer une liste de contacts',
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/ContactListId' }],
        responses: {
          '204': { description: 'Liste supprimee' },
          '401': {
            description: 'Token manquant ou invalide',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          '404': {
            description: 'Liste introuvable',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/api/contact-lists/{id}/contacts': {
      post: {
        tags: ['Contact Lists'],
        summary: 'Ajouter un contact a une liste',
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/ContactListId' }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/AddContactToListRequest',
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Contact ajoute a la liste',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ContactListActionResponse',
                },
              },
            },
          },
          '200': {
            description: 'Contact deja present dans la liste',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ContactListActionResponse',
                },
              },
            },
          },
          '401': {
            description: 'Token manquant ou invalide',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          '404': {
            description: 'Liste ou contact introuvable',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          '422': {
            description: 'Donnees invalides',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ValidationErrorResponse',
                },
              },
            },
          },
        },
      },
    },
    '/api/contact-lists/{id}/contacts/{contactId}': {
      delete: {
        tags: ['Contact Lists'],
        summary: 'Retirer un contact d une liste',
        security: [{ bearerAuth: [] }],
        parameters: [
          { $ref: '#/components/parameters/ContactListId' },
          { $ref: '#/components/parameters/ContactIdForList' },
        ],
        responses: {
          '204': { description: 'Contact retire de la liste' },
          '401': {
            description: 'Token manquant ou invalide',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          '404': {
            description: 'Relation liste/contact introuvable',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          '422': {
            description: 'Parametres invalides',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ValidationErrorResponse',
                },
              },
            },
          },
        },
      },
    },
    '/api/imports/contacts': {
      post: {
        tags: ['Imports'],
        summary: 'Importer des contacts depuis un fichier CSV',
        description:
          'Le fichier doit contenir une colonne email. Les colonnes optionnelles reconnues sont firstName/first_name/prenom et lastName/last_name/nom.',
        security: [
          {
            bearerAuth: [],
          },
        ],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['file'],
                properties: {
                  file: {
                    type: 'string',
                    format: 'binary',
                    description: 'Fichier CSV de contacts.',
                  },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Import termine',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ContactImportResponse',
                },
              },
            },
          },
          '401': {
            description: 'Token manquant ou invalide',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
              },
            },
          },
          '422': {
            description: 'Fichier manquant ou invalide',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ValidationErrorResponse',
                },
              },
            },
          },
        },
      },
    },
    '/api/imports/{id}': {
      get: {
        tags: ['Imports'],
        summary: 'Afficher le rapport d un import',
        security: [
          {
            bearerAuth: [],
          },
        ],
        parameters: [
          {
            $ref: '#/components/parameters/ImportId',
          },
        ],
        responses: {
          '200': {
            description: 'Rapport d import',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ContactImportResponse',
                },
              },
            },
          },
          '401': {
            description: 'Token manquant ou invalide',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
              },
            },
          },
          '404': {
            description: 'Import introuvable',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
              },
            },
          },
        },
      },
    },
    '/api/templates': {
      get: {
        tags: ['Templates'],
        summary: 'Lister les templates email',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Liste des templates',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/TemplateCollectionResponse',
                },
              },
            },
          },
          '401': {
            description: 'Token manquant ou invalide',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
      post: {
        tags: ['Templates'],
        summary: 'Creer un template email',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateTemplateRequest' },
            },
          },
        },
        responses: {
          '201': {
            description: 'Template cree',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/TemplateResponse' },
              },
            },
          },
          '401': {
            description: 'Token manquant ou invalide',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          '422': {
            description: 'Donnees invalides',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ValidationErrorResponse',
                },
              },
            },
          },
        },
      },
    },
    '/api/templates/{id}': {
      get: {
        tags: ['Templates'],
        summary: 'Afficher un template email',
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/TemplateId' }],
        responses: {
          '200': {
            description: 'Template trouve',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/TemplateResponse' },
              },
            },
          },
          '401': {
            description: 'Token manquant ou invalide',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          '404': {
            description: 'Template introuvable',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
      patch: {
        tags: ['Templates'],
        summary: 'Modifier un template email',
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/TemplateId' }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UpdateTemplateRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Template modifie',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/TemplateResponse' },
              },
            },
          },
          '401': {
            description: 'Token manquant ou invalide',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          '404': {
            description: 'Template introuvable',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          '422': {
            description: 'Donnees invalides',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ValidationErrorResponse',
                },
              },
            },
          },
        },
      },
      delete: {
        tags: ['Templates'],
        summary: 'Supprimer un template email',
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/TemplateId' }],
        responses: {
          '204': { description: 'Template supprime' },
          '401': {
            description: 'Token manquant ou invalide',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          '404': {
            description: 'Template introuvable',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/api/templates/{id}/preview': {
      post: {
        tags: ['Templates'],
        summary: 'Previsualiser un template avec variables',
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/TemplateId' }],
        requestBody: {
          required: false,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/RenderTemplateRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Template rendu',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/RenderedTemplateResponse' },
              },
            },
          },
          '401': {
            description: 'Token manquant ou invalide',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          '404': {
            description: 'Template introuvable',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          '422': {
            description: 'Donnees invalides',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ValidationErrorResponse',
                },
              },
            },
          },
        },
      },
    },
    '/api/templates/{id}/test-send': {
      post: {
        tags: ['Templates'],
        summary: 'Envoyer un email de test avec un template',
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/TemplateId' }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/TestSendTemplateRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Email de test envoye ou accepte par le provider',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/TestSendTemplateResponse' },
              },
            },
          },
          '401': {
            description: 'Token manquant ou invalide',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          '404': {
            description: 'Template introuvable',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          '422': {
            description: 'Donnees invalides',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ValidationErrorResponse',
                },
              },
            },
          },
          '502': {
            description: 'Erreur du provider email',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/api/campaigns': {
      get: {
        tags: ['Campaigns'],
        summary: 'Lister les campagnes',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Liste des campagnes',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/CampaignCollectionResponse',
                },
              },
            },
          },
          '401': {
            description: 'Token manquant ou invalide',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
      post: {
        tags: ['Campaigns'],
        summary: 'Creer une campagne',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateCampaignRequest' },
            },
          },
        },
        responses: {
          '201': {
            description: 'Campagne creee',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CampaignResponse' },
              },
            },
          },
          '401': {
            description: 'Token manquant ou invalide',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          '404': {
            description: 'Template ou liste de contacts introuvable',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          '422': {
            description: 'Donnees invalides',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ValidationErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/api/campaigns/{id}': {
      get: {
        tags: ['Campaigns'],
        summary: 'Afficher une campagne',
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/CampaignId' }],
        responses: {
          '200': {
            description: 'Campagne trouvee',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CampaignResponse' },
              },
            },
          },
          '401': {
            description: 'Token manquant ou invalide',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          '404': {
            description: 'Campagne introuvable',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
      patch: {
        tags: ['Campaigns'],
        summary: 'Modifier une campagne',
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/CampaignId' }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UpdateCampaignRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Campagne modifiee',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CampaignResponse' },
              },
            },
          },
          '401': {
            description: 'Token manquant ou invalide',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          '404': {
            description: 'Campagne introuvable',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          '422': {
            description: 'Donnees invalides',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ValidationErrorResponse' },
              },
            },
          },
        },
      },
      delete: {
        tags: ['Campaigns'],
        summary: 'Supprimer une campagne',
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/CampaignId' }],
        responses: {
          '204': { description: 'Campagne supprimee' },
          '401': {
            description: 'Token manquant ou invalide',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          '404': {
            description: 'Campagne introuvable',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/api/campaigns/{id}/prepare': {
      post: {
        tags: ['Campaigns'],
        summary: 'Preparer les destinataires d une campagne',
        description:
          'Cree les recipients depuis la liste de contacts associee, en excluant les contacts inactifs, desabonnes et supprimes.',
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/CampaignId' }],
        responses: {
          '200': {
            description: 'Campagne preparee',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CampaignPrepareResponse' },
              },
            },
          },
          '401': {
            description: 'Token manquant ou invalide',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          '404': {
            description: 'Campagne introuvable',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/api/campaigns/{id}/send': {
      post: {
        tags: ['Campaigns'],
        summary: 'Envoyer une campagne',
        description:
          'Envoie les recipients pending via le provider email actif. Pour le MVP, l envoi est synchrone.',
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/CampaignId' }],
        responses: {
          '200': {
            description: 'Envoi termine',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CampaignSendResponse' },
              },
            },
          },
          '401': {
            description: 'Token manquant ou invalide',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          '404': {
            description: 'Campagne introuvable',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          '409': {
            description: 'Campagne non envoyable',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/api/campaigns/{id}/cancel': {
      post: {
        tags: ['Campaigns'],
        summary: 'Annuler une campagne',
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/CampaignId' }],
        responses: {
          '200': {
            description: 'Campagne annulee',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CampaignResponse' },
              },
            },
          },
          '401': {
            description: 'Token manquant ou invalide',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          '404': {
            description: 'Campagne introuvable',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/api/campaigns/{id}/stats': {
      get: {
        tags: ['Campaigns'],
        summary: 'Afficher les statistiques d une campagne',
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/CampaignId' }],
        responses: {
          '200': {
            description: 'Statistiques de campagne',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CampaignStatsResponse' },
              },
            },
          },
          '401': {
            description: 'Token manquant ou invalide',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          '404': {
            description: 'Campagne introuvable',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/api/campaigns/{id}/recipients': {
      get: {
        tags: ['Campaigns'],
        summary: 'Lister les destinataires d une campagne',
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/CampaignId' }],
        responses: {
          '200': {
            description: 'Destinataires de campagne',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/CampaignRecipientCollectionResponse',
                },
              },
            },
          },
          '401': {
            description: 'Token manquant ou invalide',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          '404': {
            description: 'Campagne introuvable',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/api/email-logs': {
      get: {
        tags: ['Email Logs'],
        summary: 'Lister les logs d envoi',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Logs d envoi',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/EmailLogCollectionResponse' },
              },
            },
          },
          '401': {
            description: 'Token manquant ou invalide',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/api/email-logs/{id}': {
      get: {
        tags: ['Email Logs'],
        summary: 'Afficher un log d envoi',
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/EmailLogId' }],
        responses: {
          '200': {
            description: 'Log d envoi',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/EmailLogResponse' },
              },
            },
          },
          '401': {
            description: 'Token manquant ou invalide',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          '404': {
            description: 'Log introuvable',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/api/mail/providers': {
      get: {
        tags: ['Mail'],
        summary: 'Lister les providers email disponibles',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Providers email',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['data'],
                  properties: {
                    data: {
                      type: 'array',
                      items: {
                        $ref: '#/components/schemas/MailProvider',
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/mail/providers/active': {
      get: {
        tags: ['Mail'],
        summary: 'Afficher le provider email actif',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Provider actif',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['data'],
                  properties: {
                    data: {
                      $ref: '#/components/schemas/ActiveMailProvider',
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/mail/test': {
      post: {
        tags: ['Mail'],
        summary: 'Envoyer un email de test via le provider actif',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/MailTestRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Email de test envoye ou accepte',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/TestSendTemplateResponse' },
              },
            },
          },
          '422': {
            description: 'Donnees invalides',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ValidationErrorResponse' },
              },
            },
          },
          '502': {
            description: 'Erreur provider email',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/api/webhooks/wassenger/register': {
      post: {
        tags: ['Webhooks'],
        summary: 'Enregistrer le webhook Wassenger',
        description:
          'Cree un webhook Wassenger pointant vers /api/webhooks/wassenger. Necessite WASSENGER_API_TOKEN dans le fichier .env.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: false,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: {
                    type: 'string',
                    example: 'Top Teaser',
                    maxLength: 30,
                  },
                  device: {
                    type: 'string',
                    example: '6a4f645ce502e209c97439df',
                    pattern: '^[0-9A-Fa-f]{24}$',
                  },
                  url: {
                    type: 'string',
                    format: 'uri',
                    example:
                      'https://top-teaser.com/api/webhooks/wassenger?token=secret',
                  },
                  events: {
                    type: 'array',
                    items: { type: 'string' },
                    example: [
                      'message:out:new',
                      'message:out:sent',
                      'message:out:ack',
                      'message:out:failed',
                    ],
                  },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Webhook Wassenger cree',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: {
                      type: 'object',
                      properties: {
                        request: {
                          type: 'object',
                          additionalProperties: true,
                        },
                        response: {
                          type: 'object',
                          additionalProperties: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          '401': {
            description: 'Non authentifie',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          '422': {
            description: 'Payload invalide',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ValidationErrorResponse' },
              },
            },
          },
          '502': {
            description: 'Erreur Wassenger',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/api/webhooks/{provider}': {
      post: {
        tags: ['Webhooks'],
        summary: 'Recevoir un evenement provider',
        parameters: [{ $ref: '#/components/parameters/WebhookProvider' }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                additionalProperties: true,
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Webhook recu',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/MessageResponse' },
              },
            },
          },
          '404': {
            description: 'Provider non supporte',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/unsubscribe/{token}': {
      get: {
        tags: ['Unsubscribes'],
        summary: 'Desabonner une adresse via un token public',
        parameters: [{ $ref: '#/components/parameters/UnsubscribeToken' }],
        responses: {
          '200': { description: 'Adresse desabonnee' },
          '400': { description: 'Token invalide' },
        },
      },
    },
    '/api/unsubscribes': {
      post: {
        tags: ['Unsubscribes'],
        summary: 'Desabonner une adresse via token ou email',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UnsubscribeRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Desabonnement effectue',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/MessageResponse' },
              },
            },
          },
          '400': {
            description: 'Token invalide',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          '422': {
            description: 'Donnees invalides',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ValidationErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/api/suppressions': {
      get: {
        tags: ['Suppressions'],
        summary: 'Lister les adresses exclues',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Liste d exclusion',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/SuppressionCollectionResponse' },
              },
            },
          },
        },
      },
      post: {
        tags: ['Suppressions'],
        summary: 'Ajouter une adresse a la liste d exclusion',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateSuppressionRequest' },
            },
          },
        },
        responses: {
          '201': {
            description: 'Suppression creee',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/SuppressionResponse' },
              },
            },
          },
          '422': {
            description: 'Donnees invalides',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ValidationErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/api/suppressions/{id}': {
      delete: {
        tags: ['Suppressions'],
        summary: 'Retirer une adresse de la liste d exclusion',
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/SuppressionId' }],
        responses: {
          '204': { description: 'Suppression retiree' },
          '404': {
            description: 'Suppression introuvable',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    parameters: {
      ContactId: {
        name: 'id',
        in: 'path',
        required: true,
        description: 'Identifiant du contact',
        schema: {
          type: 'integer',
          minimum: 1,
          example: 1,
        },
      },
      ImportId: {
        name: 'id',
        in: 'path',
        required: true,
        description: 'Identifiant de l import',
        schema: {
          type: 'integer',
          minimum: 1,
          example: 1,
        },
      },
      ContactListId: {
        name: 'id',
        in: 'path',
        required: true,
        description: 'Identifiant de la liste de contacts',
        schema: {
          type: 'integer',
          minimum: 1,
          example: 1,
        },
      },
      ContactIdForList: {
        name: 'contactId',
        in: 'path',
        required: true,
        description: 'Identifiant du contact a retirer de la liste',
        schema: {
          type: 'integer',
          minimum: 1,
          example: 12,
        },
      },
      TemplateId: {
        name: 'id',
        in: 'path',
        required: true,
        description: 'Identifiant du template email',
        schema: {
          type: 'integer',
          minimum: 1,
          example: 1,
        },
      },
      CampaignId: {
        name: 'id',
        in: 'path',
        required: true,
        description: 'Identifiant de la campagne',
        schema: {
          type: 'integer',
          minimum: 1,
          example: 1,
        },
      },
      EmailLogId: {
        name: 'id',
        in: 'path',
        required: true,
        description: 'Identifiant du log email',
        schema: {
          type: 'integer',
          minimum: 1,
          example: 1,
        },
      },
      WebhookProvider: {
        name: 'provider',
        in: 'path',
        required: true,
        description: 'Provider email source de l evenement',
        schema: {
          type: 'string',
          enum: ['postmark', 'sendgrid', 'mailgun', 'brevo', 'amazon-ses'],
          example: 'postmark',
        },
      },
      UnsubscribeToken: {
        name: 'token',
        in: 'path',
        required: true,
        description: 'Token signe de desabonnement',
        schema: {
          type: 'string',
        },
      },
      SuppressionId: {
        name: 'id',
        in: 'path',
        required: true,
        description: 'Identifiant de l entree de suppression',
        schema: {
          type: 'integer',
          minimum: 1,
          example: 1,
        },
      },
    },
    schemas: {
      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: {
            type: 'string',
            format: 'email',
            example: 'admin@example.com',
          },
          password: {
            type: 'string',
            format: 'password',
            example: 'secret',
          },
        },
      },
      AdminUser: {
        type: 'object',
        required: ['id', 'name', 'email', 'role'],
        properties: {
          id: {
            type: 'integer',
            example: 1,
          },
          name: {
            type: 'string',
            example: 'Admin Top Teaser',
          },
          email: {
            type: 'string',
            format: 'email',
            example: 'admin@example.com',
          },
          role: {
            type: 'string',
            enum: ['admin'],
            example: 'admin',
          },
        },
      },
      AuthSession: {
        type: 'object',
        required: ['token', 'user'],
        properties: {
          token: {
            type: 'string',
            description: 'Token JWT a envoyer dans Authorization: Bearer <token>.',
            example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          },
          user: {
            $ref: '#/components/schemas/AdminUser',
          },
        },
      },
      AuthSessionResponse: {
        type: 'object',
        required: ['data'],
        properties: {
          data: {
            $ref: '#/components/schemas/AuthSession',
          },
        },
      },
      CurrentUserResponse: {
        type: 'object',
        required: ['data'],
        properties: {
          data: {
            $ref: '#/components/schemas/AdminUser',
          },
        },
      },
      MessageResponse: {
        type: 'object',
        required: ['message'],
        properties: {
          message: {
            type: 'string',
            example: 'Logged out successfully.',
          },
        },
      },
      ErrorResponse: {
        type: 'object',
        required: ['message'],
        properties: {
          message: {
            type: 'string',
            example: 'Invalid authentication token.',
          },
        },
      },
      ValidationErrorResponse: {
        type: 'object',
        required: ['message', 'errors'],
        properties: {
          message: {
            type: 'string',
            example: 'Invalid login payload.',
          },
          errors: {
            type: 'object',
            additionalProperties: {
              type: 'array',
              items: {
                type: 'string',
              },
            },
            example: {
              email: ['Invalid email address'],
            },
          },
        },
      },
      ContactStatus: {
        type: 'string',
        enum: ['active', 'invalid', 'bounced', 'unsubscribed'],
        example: 'active',
      },
      Contact: {
        type: 'object',
        required: [
          'id',
          'email',
          'firstName',
          'lastName',
          'status',
          'unsubscribedAt',
          'createdAt',
          'updatedAt',
        ],
        properties: {
          id: {
            type: 'integer',
            example: 1,
          },
          email: {
            type: 'string',
            format: 'email',
            example: 'client@example.com',
          },
          firstName: {
            type: 'string',
            nullable: true,
            example: 'Awa',
          },
          lastName: {
            type: 'string',
            nullable: true,
            example: 'Kone',
          },
          status: {
            $ref: '#/components/schemas/ContactStatus',
          },
          unsubscribedAt: {
            type: 'string',
            format: 'date-time',
            nullable: true,
            example: null,
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
            example: '2026-07-06T12:00:00.000Z',
          },
          updatedAt: {
            type: 'string',
            format: 'date-time',
            example: '2026-07-06T12:00:00.000Z',
          },
        },
      },
      CreateContactRequest: {
        type: 'object',
        required: ['email'],
        properties: {
          email: {
            type: 'string',
            format: 'email',
            maxLength: 190,
            example: 'client@example.com',
          },
          firstName: {
            type: 'string',
            nullable: true,
            maxLength: 120,
            example: 'Awa',
          },
          lastName: {
            type: 'string',
            nullable: true,
            maxLength: 120,
            example: 'Kone',
          },
          status: {
            $ref: '#/components/schemas/ContactStatus',
          },
        },
      },
      UpdateContactRequest: {
        type: 'object',
        minProperties: 1,
        properties: {
          email: {
            type: 'string',
            format: 'email',
            maxLength: 190,
            example: 'client@example.com',
          },
          firstName: {
            type: 'string',
            nullable: true,
            maxLength: 120,
            example: 'Awa',
          },
          lastName: {
            type: 'string',
            nullable: true,
            maxLength: 120,
            example: 'Kone',
          },
          status: {
            $ref: '#/components/schemas/ContactStatus',
          },
          unsubscribedAt: {
            type: 'string',
            format: 'date-time',
            nullable: true,
            example: null,
          },
        },
      },
      ContactResponse: {
        type: 'object',
        required: ['data'],
        properties: {
          data: {
            $ref: '#/components/schemas/Contact',
          },
        },
      },
      ContactCollectionResponse: {
        type: 'object',
        required: ['data'],
        properties: {
          data: {
            type: 'array',
            items: {
              $ref: '#/components/schemas/Contact',
            },
          },
        },
      },
      ContactList: {
        type: 'object',
        required: [
          'id',
          'name',
          'description',
          'contactsCount',
          'createdAt',
          'updatedAt',
        ],
        properties: {
          id: {
            type: 'integer',
            example: 1,
          },
          name: {
            type: 'string',
            example: 'Clients Abidjan',
          },
          description: {
            type: 'string',
            nullable: true,
            example: 'Contacts clients pour les campagnes locales.',
          },
          contactsCount: {
            type: 'integer',
            example: 42,
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
            example: '2026-07-06T12:00:00.000Z',
          },
          updatedAt: {
            type: 'string',
            format: 'date-time',
            example: '2026-07-06T12:00:00.000Z',
          },
        },
      },
      ContactListWithContacts: {
        allOf: [
          {
            $ref: '#/components/schemas/ContactList',
          },
          {
            type: 'object',
            required: ['contacts'],
            properties: {
              contacts: {
                type: 'array',
                items: {
                  $ref: '#/components/schemas/Contact',
                },
              },
            },
          },
        ],
      },
      CreateContactListRequest: {
        type: 'object',
        required: ['name'],
        properties: {
          name: {
            type: 'string',
            maxLength: 160,
            example: 'Clients Abidjan',
          },
          description: {
            type: 'string',
            nullable: true,
            example: 'Contacts clients pour les campagnes locales.',
          },
        },
      },
      UpdateContactListRequest: {
        type: 'object',
        minProperties: 1,
        properties: {
          name: {
            type: 'string',
            maxLength: 160,
            example: 'Clients premium',
          },
          description: {
            type: 'string',
            nullable: true,
            example: 'Contacts clients a forte priorite.',
          },
        },
      },
      AddContactToListRequest: {
        type: 'object',
        required: ['contactId'],
        properties: {
          contactId: {
            type: 'integer',
            minimum: 1,
            example: 12,
          },
        },
      },
      ContactListResponse: {
        type: 'object',
        required: ['data'],
        properties: {
          data: {
            $ref: '#/components/schemas/ContactListWithContacts',
          },
        },
      },
      ContactListActionResponse: {
        type: 'object',
        required: ['data', 'message'],
        properties: {
          data: {
            $ref: '#/components/schemas/ContactListWithContacts',
          },
          message: {
            type: 'string',
            example: 'Contact attached to list.',
          },
        },
      },
      ContactListCollectionResponse: {
        type: 'object',
        required: ['data'],
        properties: {
          data: {
            type: 'array',
            items: {
              $ref: '#/components/schemas/ContactList',
            },
          },
        },
      },
      ContactImportRowStatus: {
        type: 'string',
        enum: ['imported', 'duplicate', 'invalid'],
        example: 'imported',
      },
      ContactImportSummaryRow: {
        type: 'object',
        required: ['rowNumber', 'email', 'status', 'reason'],
        properties: {
          rowNumber: {
            type: 'integer',
            example: 2,
          },
          email: {
            type: 'string',
            format: 'email',
            nullable: true,
            example: 'client@example.com',
          },
          status: {
            $ref: '#/components/schemas/ContactImportRowStatus',
          },
          reason: {
            type: 'string',
            nullable: true,
            example: null,
          },
        },
      },
      ContactImportSummary: {
        type: 'object',
        required: [
          'totalRows',
          'importedRows',
          'duplicateRows',
          'invalidRows',
          'rows',
        ],
        properties: {
          totalRows: {
            type: 'integer',
            example: 120,
          },
          importedRows: {
            type: 'integer',
            example: 110,
          },
          duplicateRows: {
            type: 'integer',
            example: 7,
          },
          invalidRows: {
            type: 'integer',
            example: 3,
          },
          rows: {
            type: 'array',
            items: {
              $ref: '#/components/schemas/ContactImportSummaryRow',
            },
          },
        },
      },
      ContactImport: {
        type: 'object',
        required: [
          'id',
          'originalFilename',
          'status',
          'totalRows',
          'importedRows',
          'duplicateRows',
          'invalidRows',
          'summary',
          'errorMessage',
          'createdAt',
          'updatedAt',
        ],
        properties: {
          id: {
            type: 'integer',
            example: 1,
          },
          originalFilename: {
            type: 'string',
            example: 'contacts.csv',
          },
          status: {
            type: 'string',
            enum: ['completed', 'failed'],
            example: 'completed',
          },
          totalRows: {
            type: 'integer',
            example: 120,
          },
          importedRows: {
            type: 'integer',
            example: 110,
          },
          duplicateRows: {
            type: 'integer',
            example: 7,
          },
          invalidRows: {
            type: 'integer',
            example: 3,
          },
          summary: {
            nullable: true,
            allOf: [
              {
                $ref: '#/components/schemas/ContactImportSummary',
              },
            ],
          },
          errorMessage: {
            type: 'string',
            nullable: true,
            example: null,
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
            example: '2026-07-06T12:00:00.000Z',
          },
          updatedAt: {
            type: 'string',
            format: 'date-time',
            example: '2026-07-06T12:00:00.000Z',
          },
        },
      },
      ContactImportResponse: {
        type: 'object',
        required: ['data'],
        properties: {
          data: {
            $ref: '#/components/schemas/ContactImport',
          },
        },
      },
      EmailTemplate: {
        type: 'object',
        required: [
          'id',
          'name',
          'subject',
          'htmlContent',
          'textContent',
          'createdAt',
          'updatedAt',
        ],
        properties: {
          id: {
            type: 'integer',
            example: 1,
          },
          name: {
            type: 'string',
            example: 'Bienvenue client',
          },
          subject: {
            type: 'string',
            example: 'Bonjour {{firstName}}, bienvenue chez Top Teaser',
          },
          htmlContent: {
            type: 'string',
            example: '<h1>Bonjour {{firstName}}</h1><p>Merci pour votre inscription.</p>',
          },
          textContent: {
            type: 'string',
            nullable: true,
            example: 'Bonjour {{firstName}}, merci pour votre inscription.',
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
            example: '2026-07-06T12:00:00.000Z',
          },
          updatedAt: {
            type: 'string',
            format: 'date-time',
            example: '2026-07-06T12:00:00.000Z',
          },
        },
      },
      CreateTemplateRequest: {
        type: 'object',
        required: ['name', 'subject', 'htmlContent'],
        properties: {
          name: {
            type: 'string',
            maxLength: 160,
            example: 'Bienvenue client',
          },
          subject: {
            type: 'string',
            maxLength: 255,
            example: 'Bonjour {{firstName}}, bienvenue chez Top Teaser',
          },
          htmlContent: {
            type: 'string',
            example: '<h1>Bonjour {{firstName}}</h1><p>Merci pour votre inscription.</p>',
          },
          textContent: {
            type: 'string',
            nullable: true,
            example: 'Bonjour {{firstName}}, merci pour votre inscription.',
          },
        },
      },
      UpdateTemplateRequest: {
        type: 'object',
        minProperties: 1,
        properties: {
          name: {
            type: 'string',
            maxLength: 160,
            example: 'Bienvenue clients premium',
          },
          subject: {
            type: 'string',
            maxLength: 255,
            example: 'Bonjour {{firstName}}, une offre pour vous',
          },
          htmlContent: {
            type: 'string',
            example: '<h1>Bonjour {{firstName}}</h1><p>Voici votre offre.</p>',
          },
          textContent: {
            type: 'string',
            nullable: true,
            example: 'Bonjour {{firstName}}, voici votre offre.',
          },
        },
      },
      TemplateVariables: {
        type: 'object',
        additionalProperties: true,
        example: {
          firstName: 'Awa',
          lastName: 'Kone',
          email: 'client@example.com',
        },
      },
      RenderTemplateRequest: {
        type: 'object',
        properties: {
          variables: {
            $ref: '#/components/schemas/TemplateVariables',
          },
        },
      },
      RenderedTemplate: {
        type: 'object',
        required: ['subject', 'html', 'text'],
        properties: {
          subject: {
            type: 'string',
            example: 'Bonjour Awa, bienvenue chez Top Teaser',
          },
          html: {
            type: 'string',
            example: '<h1>Bonjour Awa</h1><p>Merci pour votre inscription.</p>',
          },
          text: {
            type: 'string',
            nullable: true,
            example: 'Bonjour Awa, merci pour votre inscription.',
          },
        },
      },
      TemplateResponse: {
        type: 'object',
        required: ['data'],
        properties: {
          data: {
            $ref: '#/components/schemas/EmailTemplate',
          },
        },
      },
      TemplateCollectionResponse: {
        type: 'object',
        required: ['data'],
        properties: {
          data: {
            type: 'array',
            items: {
              $ref: '#/components/schemas/EmailTemplate',
            },
          },
        },
      },
      RenderedTemplateResponse: {
        type: 'object',
        required: ['data'],
        properties: {
          data: {
            $ref: '#/components/schemas/RenderedTemplate',
          },
        },
      },
      TestSendTemplateRequest: {
        type: 'object',
        required: ['to'],
        properties: {
          to: {
            type: 'object',
            required: ['email'],
            properties: {
              email: {
                type: 'string',
                format: 'email',
                example: 'admin@example.com',
              },
              name: {
                type: 'string',
                example: 'Admin Top Teaser',
              },
            },
          },
          variables: {
            $ref: '#/components/schemas/TemplateVariables',
          },
        },
      },
      MailSendResult: {
        type: 'object',
        required: ['provider', 'status'],
        properties: {
          provider: {
            type: 'string',
            enum: ['postmark', 'sendgrid', 'mailgun', 'brevo', 'amazon-ses'],
            example: 'postmark',
          },
          providerMessageId: {
            type: 'string',
            example: 'abc-123',
          },
          status: {
            type: 'string',
            enum: ['sent', 'queued'],
            example: 'sent',
          },
          raw: {
            nullable: true,
          },
        },
      },
      TestSendTemplateResponse: {
        type: 'object',
        required: ['data'],
        properties: {
          data: {
            $ref: '#/components/schemas/MailSendResult',
          },
        },
      },
      CampaignStatus: {
        type: 'string',
        enum: ['draft', 'ready', 'sending', 'sent', 'failed', 'cancelled'],
        example: 'draft',
      },
      CampaignRecipientStatus: {
        type: 'string',
        enum: [
          'pending',
          'sent',
          'failed',
          'bounced',
          'opened',
          'clicked',
          'unsubscribed',
        ],
        example: 'pending',
      },
      Campaign: {
        type: 'object',
        required: [
          'id',
          'name',
          'subject',
          'templateId',
          'contactListId',
          'status',
          'scheduledAt',
          'sentAt',
          'recipientsCount',
          'createdAt',
          'updatedAt',
        ],
        properties: {
          id: { type: 'integer', example: 1 },
          name: { type: 'string', example: 'Promo juillet' },
          subject: {
            type: 'string',
            example: 'Bonjour {{firstName}}, offre speciale',
          },
          templateId: { type: 'integer', example: 1 },
          contactListId: { type: 'integer', example: 1 },
          status: { $ref: '#/components/schemas/CampaignStatus' },
          scheduledAt: {
            type: 'string',
            format: 'date-time',
            nullable: true,
            example: null,
          },
          sentAt: {
            type: 'string',
            format: 'date-time',
            nullable: true,
            example: null,
          },
          recipientsCount: { type: 'integer', example: 120 },
          createdAt: {
            type: 'string',
            format: 'date-time',
            example: '2026-07-06T12:00:00.000Z',
          },
          updatedAt: {
            type: 'string',
            format: 'date-time',
            example: '2026-07-06T12:00:00.000Z',
          },
        },
      },
      CreateCampaignRequest: {
        type: 'object',
        required: ['name', 'subject', 'templateId', 'contactListId'],
        properties: {
          name: { type: 'string', maxLength: 160, example: 'Promo juillet' },
          subject: {
            type: 'string',
            maxLength: 255,
            example: 'Bonjour {{firstName}}, offre speciale',
          },
          templateId: { type: 'integer', minimum: 1, example: 1 },
          contactListId: { type: 'integer', minimum: 1, example: 1 },
          scheduledAt: {
            type: 'string',
            format: 'date-time',
            nullable: true,
            example: null,
          },
        },
      },
      UpdateCampaignRequest: {
        type: 'object',
        minProperties: 1,
        properties: {
          name: { type: 'string', maxLength: 160, example: 'Promo aout' },
          subject: {
            type: 'string',
            maxLength: 255,
            example: 'Bonjour {{firstName}}, nouvelle offre',
          },
          templateId: { type: 'integer', minimum: 1, example: 1 },
          contactListId: { type: 'integer', minimum: 1, example: 1 },
          scheduledAt: {
            type: 'string',
            format: 'date-time',
            nullable: true,
            example: null,
          },
          status: { $ref: '#/components/schemas/CampaignStatus' },
        },
      },
      CampaignResponse: {
        type: 'object',
        required: ['data'],
        properties: {
          data: { $ref: '#/components/schemas/Campaign' },
        },
      },
      CampaignCollectionResponse: {
        type: 'object',
        required: ['data'],
        properties: {
          data: {
            type: 'array',
            items: { $ref: '#/components/schemas/Campaign' },
          },
        },
      },
      CampaignStats: {
        type: 'object',
        required: [
          'total',
          'pending',
          'sent',
          'failed',
          'bounced',
          'opened',
          'clicked',
          'unsubscribed',
        ],
        properties: {
          total: { type: 'integer', example: 120 },
          pending: { type: 'integer', example: 0 },
          sent: { type: 'integer', example: 115 },
          failed: { type: 'integer', example: 5 },
          bounced: { type: 'integer', example: 0 },
          opened: { type: 'integer', example: 0 },
          clicked: { type: 'integer', example: 0 },
          unsubscribed: { type: 'integer', example: 0 },
        },
      },
      CampaignStatsResponse: {
        type: 'object',
        required: ['data'],
        properties: {
          data: { $ref: '#/components/schemas/CampaignStats' },
        },
      },
      CampaignPrepareResponse: {
        type: 'object',
        required: ['data'],
        properties: {
          data: {
            type: 'object',
            required: ['preparedRecipients', 'stats'],
            properties: {
              preparedRecipients: { type: 'integer', example: 120 },
              stats: { $ref: '#/components/schemas/CampaignStats' },
            },
          },
        },
      },
      CampaignSendResponse: {
        type: 'object',
        required: ['data'],
        properties: {
          data: {
            type: 'object',
            required: ['sent', 'failed', 'stats'],
            properties: {
              sent: { type: 'integer', example: 115 },
              failed: { type: 'integer', example: 5 },
              stats: { $ref: '#/components/schemas/CampaignStats' },
            },
          },
        },
      },
      CampaignRecipient: {
        type: 'object',
        required: [
          'id',
          'campaignId',
          'contactId',
          'providerMessageId',
          'status',
          'errorMessage',
          'sentAt',
          'createdAt',
          'updatedAt',
          'contact',
        ],
        properties: {
          id: { type: 'integer', example: 1 },
          campaignId: { type: 'integer', example: 1 },
          contactId: { type: 'integer', example: 12 },
          providerMessageId: {
            type: 'string',
            nullable: true,
            example: 'abc-123',
          },
          status: { $ref: '#/components/schemas/CampaignRecipientStatus' },
          errorMessage: {
            type: 'string',
            nullable: true,
            example: null,
          },
          sentAt: {
            type: 'string',
            format: 'date-time',
            nullable: true,
            example: null,
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
            example: '2026-07-06T12:00:00.000Z',
          },
          updatedAt: {
            type: 'string',
            format: 'date-time',
            example: '2026-07-06T12:00:00.000Z',
          },
          contact: { $ref: '#/components/schemas/Contact' },
        },
      },
      CampaignRecipientCollectionResponse: {
        type: 'object',
        required: ['data'],
        properties: {
          data: {
            type: 'array',
            items: { $ref: '#/components/schemas/CampaignRecipient' },
          },
        },
      },
      EmailLog: {
        type: 'object',
        required: [
          'id',
          'campaignId',
          'campaignName',
          'contactId',
          'email',
          'providerMessageId',
          'status',
          'errorMessage',
          'sentAt',
          'createdAt',
          'updatedAt',
        ],
        properties: {
          id: { type: 'integer', example: 1 },
          campaignId: { type: 'integer', example: 1 },
          campaignName: { type: 'string', example: 'Promo juillet' },
          contactId: { type: 'integer', example: 12 },
          email: {
            type: 'string',
            format: 'email',
            example: 'client@example.com',
          },
          providerMessageId: {
            type: 'string',
            nullable: true,
            example: 'abc-123',
          },
          status: { $ref: '#/components/schemas/CampaignRecipientStatus' },
          errorMessage: {
            type: 'string',
            nullable: true,
            example: null,
          },
          sentAt: {
            type: 'string',
            format: 'date-time',
            nullable: true,
            example: null,
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
            example: '2026-07-06T12:00:00.000Z',
          },
          updatedAt: {
            type: 'string',
            format: 'date-time',
            example: '2026-07-06T12:00:00.000Z',
          },
        },
      },
      EmailLogResponse: {
        type: 'object',
        required: ['data'],
        properties: {
          data: { $ref: '#/components/schemas/EmailLog' },
        },
      },
      EmailLogCollectionResponse: {
        type: 'object',
        required: ['data'],
        properties: {
          data: {
            type: 'array',
            items: { $ref: '#/components/schemas/EmailLog' },
          },
        },
      },
      MailTestRequest: {
        type: 'object',
        required: ['to'],
        properties: {
          to: {
            type: 'object',
            required: ['email'],
            properties: {
              email: {
                type: 'string',
                format: 'email',
                example: 'admin@example.com',
              },
              name: {
                type: 'string',
                example: 'Admin Top Teaser',
              },
            },
          },
          subject: {
            type: 'string',
            example: 'Top Teaser test email',
          },
          html: {
            type: 'string',
            example: '<p>Top Teaser test email</p>',
          },
          text: {
            type: 'string',
            example: 'Top Teaser test email',
          },
        },
      },
      UnsubscribeRequest: {
        type: 'object',
        properties: {
          token: {
            type: 'string',
            example: 'signed-token',
          },
          email: {
            type: 'string',
            format: 'email',
            example: 'client@example.com',
          },
        },
      },
      SuppressionReason: {
        type: 'string',
        enum: ['unsubscribed', 'bounce', 'complaint', 'manual'],
        example: 'manual',
      },
      Suppression: {
        type: 'object',
        required: ['id', 'email', 'reason', 'createdAt'],
        properties: {
          id: { type: 'integer', example: 1 },
          email: {
            type: 'string',
            format: 'email',
            example: 'client@example.com',
          },
          reason: { $ref: '#/components/schemas/SuppressionReason' },
          createdAt: {
            type: 'string',
            format: 'date-time',
            example: '2026-07-06T12:00:00.000Z',
          },
        },
      },
      CreateSuppressionRequest: {
        type: 'object',
        required: ['email', 'reason'],
        properties: {
          email: {
            type: 'string',
            format: 'email',
            example: 'client@example.com',
          },
          reason: { $ref: '#/components/schemas/SuppressionReason' },
        },
      },
      SuppressionResponse: {
        type: 'object',
        required: ['data'],
        properties: {
          data: { $ref: '#/components/schemas/Suppression' },
        },
      },
      SuppressionCollectionResponse: {
        type: 'object',
        required: ['data'],
        properties: {
          data: {
            type: 'array',
            items: { $ref: '#/components/schemas/Suppression' },
          },
        },
      },
      HealthResponse: {
        type: 'object',
        required: ['status', 'service'],
        properties: {
          status: {
            type: 'string',
            example: 'ok',
          },
          service: {
            type: 'string',
            example: 'top-teaser-backend',
          },
        },
      },
      ListResponse: {
        type: 'object',
        required: ['data', 'message'],
        properties: {
          data: {
            type: 'array',
            items: {
              type: 'object',
            },
          },
          message: {
            type: 'string',
          },
        },
      },
      MailProviderHealth: {
        type: 'object',
        required: ['configured', 'missingConfig'],
        properties: {
          configured: {
            type: 'boolean',
            example: false,
          },
          missingConfig: {
            type: 'array',
            items: {
              type: 'string',
            },
            example: ['POSTMARK_SERVER_TOKEN'],
          },
        },
      },
      MailProvider: {
        type: 'object',
        required: ['key', 'name', 'active', 'health'],
        properties: {
          key: {
            type: 'string',
            enum: ['postmark', 'sendgrid', 'mailgun', 'brevo', 'amazon-ses'],
            example: 'postmark',
          },
          name: {
            type: 'string',
            example: 'Postmark',
          },
          active: {
            type: 'boolean',
            example: true,
          },
          health: {
            $ref: '#/components/schemas/MailProviderHealth',
          },
        },
      },
      ActiveMailProvider: {
        type: 'object',
        required: ['key', 'name', 'health'],
        properties: {
          key: {
            type: 'string',
            enum: ['postmark', 'sendgrid', 'mailgun', 'brevo', 'amazon-ses'],
            example: 'postmark',
          },
          name: {
            type: 'string',
            example: 'Postmark',
          },
          health: {
            $ref: '#/components/schemas/MailProviderHealth',
          },
        },
      },
    },
  },
}
