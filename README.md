# connector-as400
Une application permettant le dialogue entre Prestashop et AS400


## Structure de l'applicatif :
```
connector as400/
├── src/
│   ├── watcher/
│   │   └── fileWatcher.js       # Watches for new files in input folder
│   ├── parser/
│   │   └── fileParser.js        # Parses the content of incoming files
│   ├── prestashop/
│   │   └── apiClient.js         # Handles API communication with PrestaShop
│   ├── jobs/
│   │   └── processFile.js       # Orchestrates parse → API logic
│   └── config.js                # Centralized config
├── input/                       # AS400 drops files here
├── processed/                   # Files moved here after handling
├── failed/                      # Files moved here if processing fails
├── .env
├── index.js
└── package.json
```

## Structures et exemples des fichiers d'échange
### Demande d'expédition (email : Prestashop => AS400) 
- Entête (E)
  - E*
  - ID commande* : int(10) 
  - Ref commande : varchar(?)
  - Date commande* : datetime
- Adresse de livraison (A)
  - A*
  - Prénom* : varchar(255)
  - Nom* : varchar(255)
  - Société : varchar(255)
  - Adresse 1* : varchar(128) 
  - Adresse 2 : varchar(128) 
  - Code postal* : varchar(12) 
  - Ville* : varchar(64) 
  - Pays* : Code ISO
  - Téléphone* : varchar(32) 
  - message : text
- Transporteur (T)
  - T*
  - Nom transporteur* : varchar(64) 
- Ligne de commande (L)
  - L*
  - Concaténation ID article - ID déclinaison* : varchar(21)
  - Quantité* : int(10) 
```
E;17908;2020-02-20 10:01:58
A;Romain;Navarro;ma société;3 fausse rue;2ème étage;31000;TOULOUSE;France;0673741249;Merci de sonner en arrivant
T;Affrètement@2ml
L;1024-629;1
L;1024-630;1
```
### Confirmation d'expédition (FTP txt : AS400 => Connecteur)
- Entête (E)
  - E*
  - ID commande* : int(10) 
  - Date expédition* : datetime
- Transporteur (T)
  - T*
  - Nom transporteur* : varchar(64)
- Ligne de commande (L)
  - L*
  - Concaténation ID article - ID déclinaison* : varchar(21) => reference
  - Quantité* : int(10) 
```
E;17908;2020-02-20 10:01:58
T;Affrètement@2ml
L;1024-629;1
L;1024-630;1
```
### Demande de création d'article (email : Prestashop => AS400) 
Voir fichier articles Stéphane
### Retour articles : process Ital indépendant
```
Reference
Qté physique
Qté réservée
```