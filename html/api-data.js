/* =============================================================================
   37 EXPRESS — API COLIS v2
   SOURCE UNIQUE DE LA DOCUMENTATION / 文档唯一数据源

   COMMENT MODIFIER CE FICHIER / 如何修改本文件
   ---------------------------------------------------------------------------
   1. Chaque texte s'écrit  t("français", "中文")  — les deux langues côte à
      côte. Il est impossible de corriger une langue en oubliant l'autre.
   2. Une ligne de paramètre est un tableau :
        [ "nom/du/champ", Y ou N, "type", t("desc FR","desc ZH"), "drapeau" ]
      Y = requis, N = facultatif.
      Le drapeau est facultatif : "legacy" (hérité), "added" (ajouté),
      "fixed" (corrigé). Il affiche une pastille dans le tableau.
   3. Les fonctions addr(), relay() et pickup() génèrent les blocs d'adresse
      répétitifs. Pour modifier un champ d'adresse partout à la fois, éditez
      la fonction. Pour un cas particulier, ajoutez la ligne à la main dans
      l'endpoint concerné.
   4. Après modification : enregistrer, recharger index.html. Rien à compiler.

   ATTENTION : neuf points de ce document doivent être vérifiés contre l'API
   réelle avant publication. Voir la section "Points à trancher" en fin de
   page, et les lignes marquées "legacy" / "added".
   ========================================================================== */

const B = "https://www.37-express.com/qyfr";

/* raccourcis lisibles */
const t  = (fr,zh) => ({fr,zh});
const Y  = t("oui","是");
const N  = t("non","否");

/* ---------- paramètres réutilisés ---------- */
function addr(pfx, who){
  const W = who==="s" ? t("expéditeur","寄件人") : t("destinataire","收件人");
  const A = who==="s" ? t("d'expédition","寄件地址") : t("de livraison","收件地址");
  const rows = [
    [pfx+"/prefix",       N, "string", t("Civilité du "+W.fr, W.zh+"称呼")],
    [pfx+"/firstName",    N, "string", t("Prénom du "+W.fr, W.zh+"名字")],
    [pfx+"/lastName",     N, "string", t("Nom du "+W.fr, W.zh+"姓氏")],
    [pfx+"/companyName",  N, "string", t("Société. Obligatoire si firstName et lastName sont vides.","公司。若未填写姓名，则公司必填。")],
    [pfx+"/countryCode",  Y, "string", t("Code pays ISO 2 lettres, ex. "+(who==="s"?"FR":"US"), "国家代码（ISO 2 位），例："+(who==="s"?"FR":"US"))],
    [pfx+"/region",       N, "string", t("Région ou province "+A.fr, A.zh+"州/省")],
    [pfx+"/city",         Y, "string", t("Ville "+A.fr, A.zh+"城市")],
    [pfx+"/street",       Y, "string", t("Rue","街道地址")],
    [pfx+"/street2",      N, "string", t("Complément d'adresse","附加街道地址")],
    [pfx+"/postalCode",   Y, "string", t("Code postal","邮编")],
    [pfx+"/phoneNumber",  Y, "string", t("Téléphone du "+W.fr, W.zh+"电话")],
    [pfx+"/email",        N, "string", t("E-mail du "+W.fr, W.zh+"邮箱")],
  ];
  if(who==="r"){
    rows.splice(7,0,[pfx+"/district", N, "string", t("Arrondissement ou district. Obligatoire si le destinataire est en Chine.","城市的区/县。收件地为中国时必填。")]);
    rows.push([pfx+"/idCard", N, "string", t("Numéro de pièce d'identité du destinataire","收件人证件号码")]);
    rows.push([pfx+"/save_in_address_book", N, "int", t("1 pour enregistrer l'adresse dans le carnet","等于 1 时保存地址至地址簿")]);
  }
  return rows;
}
function relay(pfx, brand, idReq, idNote){
  return [
    [pfx+"/id", idReq, "string", idNote],
    [pfx+"/name",        Y, "string", t("Nom du point relais "+brand, brand+"驿站名称")],
    [pfx+"/countryCode", Y, "string", t("Code pays du point relais, ex. FR","驿站地址国家代码，例：FR")],
    [pfx+"/city",        Y, "string", t("Ville du point relais","驿站地址城市")],
    [pfx+"/street",      Y, "string", t("Rue du point relais","驿站街道地址")],
    [pfx+"/street2",     N, "string", t("Complément d'adresse du point relais","驿站附加街道地址")],
    [pfx+"/postalCode",  Y, "string", t("Code postal du point relais","驿站地址邮编")],
  ];
}
function pickup(pfx){
  return [
    [pfx+"/pickupDate",  Y, "date",   t("Date d'enlèvement souhaitée, format YYYY-MM-DD","预约上门取件日期，格式：YYYY-MM-DD")],
    [pfx+"/company",     N, "string", t("Votre raison sociale","您的公司名")],
    [pfx+"/name",        Y, "string", t("Personne à contacter","联系人")],
    [pfx+"/countryCode", Y, "string", t("Pays. Seul FR est accepté à ce jour.","国家，目前仅支持 FR")],
    [pfx+"/city",        Y, "string", t("Ville d'enlèvement","上门城市")],
    [pfx+"/street",      Y, "string", t("Rue d'enlèvement","上门街道地址")],
    [pfx+"/room",        N, "string", t("Numéro de porte","门牌号")],
    [pfx+"/floor",       N, "string", t("Étage","楼层")],
    [pfx+"/postalCode",  Y, "string", t("Code postal d'enlèvement","上门地址邮编")],
    [pfx+"/phoneNumber", Y, "string", t("Téléphone de contact","联系电话")],
    [pfx+"/isHome",      N, "string", t("Adresse résidentielle : Y. Adresse professionnelle : N.","是否家庭地址：是填 Y，否填 N")],
    [pfx+"/remarks",     N, "string", t("Consignes particulières","其它特别说明")],
  ];
}
const ACCOUNT = [
  ["account",          N, "object", t("Bloc hérité. Conservé pour compatibilité avec les intégrations antérieures à OAuth2. Ne pas utiliser sur les nouvelles intégrations.","遗留字段。仅为兼容 OAuth2 之前的旧集成保留，新集成请勿使用。"), "legacy"],
  ["account/email",    N, "string", t("Identifiant du compte","用户名"), "legacy"],
  ["account/password", N, "string", t("Mot de passe en clair. Ne jamais transmettre depuis un client public.","明文密码。切勿在公开客户端中传输。"), "legacy"],
];

/* ============================================================================
   SECTIONS
   ========================================================================== */

const DOC = [

/* ---------------------------------------------------------------- 0. INTRO */
{
  id:"intro", group:t("Commencer","开始"),
  nav:t("Vue d'ensemble","总览"),
  intro:true,
  h1:t("API Colis v2","包裹 API v2"),
  paras:[
    t("Cette API permet de comparer les tarifs des transporteurs, créer des bordereaux d'envoi, imprimer les étiquettes, suivre les colis et rechercher des points relais, sur l'ensemble du réseau 37 Express.",
      "本 API 用于在 37 Express 全网范围内比较承运商报价、创建运单、打印面单、查询物流轨迹以及搜索驿站。"),
    t("Tous les appels métier passent par une URL unique en POST. L'opération est déterminée par la clé racine de l'objet JSON envoyé : envoyer createShipment crée un bordereau, envoyer traces retourne un suivi.",
      "所有业务调用均以 POST 方式请求同一个 URL。具体操作由 JSON 根键决定：传 createShipment 即创建运单，传 traces 即查询轨迹。"),
    t("Une expédition se fait toujours en deux temps : demandez d'abord un devis avec les deux adresses, puis créez le bordereau avec le code d'un transporteur retourné par ce devis. Le devis ne renvoie que les transporteurs qui desservent réellement la destination, au poids et aux dimensions transmis — c'est lui qui fait autorité, pas une table de destinations recopiée dans votre code.",
      "寄件始终分两步：先携带收寄双方地址查询报价，再使用报价返回的承运商 code 创建运单。报价只会返回在该重量与尺寸下真正可寄达目的地的承运商 —— 以报价结果为准，不要在代码中硬编码目的地对照表。"),
  ],
  base:[
    [t("URL des appels métier","业务接口地址"), B+"/api/parcel/v2/"],
    [t("URL du serveur d'autorisation","授权服务器地址"), B+"/oauth2/token"],
    [t("En-têtes obligatoires","必需请求头"), "Content-Type: application/json\nAuthorization: Basic {access_token}\nX-37-EXPRESS-API-OA2: 1.0"],
  ],
  notes:[
    ["alert", t("Une seule clé racine par requête","每次请求仅允许一个根键"),
      t("Le comportement n'est pas défini si deux clés d'opération sont présentes dans le même corps de requête. N'en envoyez qu'une.",
        "若同一请求体中出现两个操作键，行为未定义。请只发送一个。")],
    ["warn", t("Le schéma Basic porte ici un jeton, pas un couple identifiant:mot de passe","此处 Basic 方案承载的是令牌，而非 用户名:密码")],
  ],
},

/* ------------------------------------------------------------ 1. OAUTH2 */
{
  id:"oauth", group:t("Commencer","开始"),
  nav:t("Authentification","身份认证"),
  verb:"POST", path:"/oauth2/token", stamp:["ok",t("Stable","稳定")],
  title:t("Obtenir et renouveler un jeton","获取与续期令牌"),
  paras:[
    t("L'accès à l'API s'obtient par la subvention client_credentials. Le serveur retourne un access_token valable 1 heure et un refresh_token valable 30 jours.",
      "通过 client_credentials 模式获取访问权限。服务器返回有效期 1 小时的 access_token 和有效期 30 天的 refresh_token。"),
  ],
  blocks:[
    {h:t("Obtenir le premier jeton","获取首个令牌"), code:
`AUTH=$(echo -n "your-client-id:your-client-secret" | base64)

curl -X POST ${B}/oauth2/token \\
  -H "Authorization: Basic $AUTH" \\
  -H "Content-Type: application/x-www-form-urlencoded" \\
  -d "grant_type=client_credentials"`},
    {h:t("Réponse","返回"), code:
`{
  "access_token": "abc123def456...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "xyz789...",
  "scope": "basic"
}`},
    {h:t("Renouveler avant expiration","过期前续期"), code:
`curl -X POST ${B}/oauth2/token \\
  -H "Content-Type: application/x-www-form-urlencoded" \\
  -d "grant_type=refresh_token&refresh_token=$REFRESH" \\
  --data-urlencode "client_id=$CLIENT_ID" \\
  --data-urlencode "client_secret=$CLIENT_SECRET"`},
    {h:t("Vérifier un jeton","验证令牌"), code:
`curl -X GET ${B}/oauth2/token/info \\
  -H "Authorization: Bearer abc123def456..."`},
  ],
  table:{cols:"params", rows:[
    ["grant_type",    Y, "string", t("client_credentials pour obtenir un jeton, refresh_token pour le renouveler.","获取令牌时填 client_credentials，续期时填 refresh_token。")],
    ["refresh_token", N, "string", t("Obligatoire si grant_type vaut refresh_token.","当 grant_type 为 refresh_token 时必填。")],
    ["client_id",     N, "string", t("Obligatoire sur le renouvellement uniquement. Sur l'obtention, il passe dans l'en-tête Basic.","仅续期时必填。获取令牌时通过 Basic 请求头传递。")],
    ["client_secret", N, "string", t("Obligatoire sur le renouvellement uniquement.","仅续期时必填。")],
    ["scope",         N, "string", t("Liste séparée par des espaces. Par défaut basic. Au renouvellement, doit rester un sous-ensemble du scope initial.","以空格分隔。默认 basic。续期时必须是原 scope 的子集。")],
  ]},
  notes:[
    ["alert", t("Chaque renouvellement invalide le refresh_token précédent","每次续期都会使旧 refresh_token 立即失效"),
      t("La configuration always_issue_new_refresh_token est active. Écrasez le couple en cache dès la réponse reçue, sinon l'appel suivant échouera en 401.",
        "服务端启用了 always_issue_new_refresh_token。收到响应后请立即覆盖本地缓存，否则下次调用将返回 401。")],
    ["info", t("Créez un identifiant par outil connecté","每个已连接的工具单独创建一组凭据"),
      t("Depuis votre espace client, vous pouvez créer plusieurs paires d'identifiants et les nommer : boutique en ligne, ERP, préparation d'entrepôt. Vous pourrez ainsi révoquer l'accès d'un outil, ou régénérer son secret, sans interrompre les autres. Régénérer un secret invalide immédiatement l'ancien : l'intégration concernée s'arrête tant que la nouvelle valeur n'est pas renseignée dans sa configuration.",
        "在客户后台可创建多组凭据并分别命名：网店、ERP、仓库拣货等。这样即可单独吊销某个工具的访问权限或重置其密钥，而不影响其他工具。重置密钥会立即使旧密钥失效：在新值写入配置之前，该集成将无法调用。")],
    ["info", t("Une seule méthode d'authentification est prise en charge","仅支持一种认证方式"),
      t("Le flux OAuth 1.0 (/oauth/initiate, /oauth/authorize) et l'envoi du couple e-mail / mot de passe dans le corps de requête relèvent de générations antérieures. Ils ne doivent pas être utilisés sur une nouvelle intégration.",
        "OAuth 1.0 流程（/oauth/initiate、/oauth/authorize）以及在请求体中传递邮箱与密码的方式均属旧版本，新集成不应使用。")],
  ],
  errors:[
    ["invalid_request",        t("Paramètre obligatoire manquant, par exemple grant_type","缺少必填参数，例如 grant_type")],
    ["invalid_client",         t("client_id ou client_secret incorrect","client_id 或 client_secret 错误")],
    ["invalid_grant",          t("refresh_token invalide, expiré ou révoqué","refresh_token 无效、已过期或已被撤销")],
    ["unauthorized_client",    t("Le client n'a pas droit à ce type de subvention","客户端无权使用该 grant 类型")],
    ["unsupported_grant_type", t("Type de subvention non pris en charge","不支持的 grant 类型")],
    ["invalid_scope",          t("Scope inconnu ou hors de la subvention initiale","scope 非法或超出原授权范围")],
    ["server_error",           t("Erreur serveur","服务端异常")],
  ],
},

/* ------------------------------------------------------------ 2. ERREURS */
{
  id:"erreurs", group:t("Commencer","开始"),
  nav:t("Format des erreurs","错误格式"),
  verb:"POST", path:"/api/parcel/v2/", stamp:["warn",t("À faire évoluer","待改进")],
  title:t("Format des erreurs métier","业务错误格式"),
  paras:[
    t("Les appels métier retournent success à false accompagné d'un message lisible. Le message est localisé côté serveur et son libellé peut changer.",
      "业务接口以 success 为 false 返回，并附带一条可读消息。该消息由服务端本地化，文案可能变动。"),
  ],
  blocks:[{h:t("Réponse en erreur","错误返回"), code:
`{
  "success": false,
  "message": "Identifiant ou mot de passe invalide."
}`}],
  notes:[
    ["alert", t("Ne branchez pas votre code sur le texte du message","请勿依据消息文本编写分支逻辑"),
      t("Le message est traduit selon la langue du compte : la même erreur peut arriver en français ou en chinois. Un champ code stable, indépendant de la langue, est en cours d'ajout. En attendant, traitez toute réponse success:false comme un échec générique et journalisez le message sans l'interpréter.",
        "该消息会依据账号语言翻译，同一错误可能返回法语或中文。稳定且与语言无关的 code 字段正在补充中。在此之前，请将所有 success:false 视为通用失败并原样记录消息，不要解析。")],
  ],
},

/* ------------------------------------------------------------ 3. DEVIS */
{
  id:"devis", group:t("Expédier","寄件"),
  nav:t("Obtenir des devis","获取报价"),
  verb:"POST", path:"carriers", stamp:["ok",t("Stable","稳定")],
  title:t("Obtenir les devis des transporteurs","获取各派送商的报价"),
  paras:[
    t("Retourne, pour un couple d'adresses et une liste de colis, les transporteurs éligibles avec leur tarif, leur délai annoncé, les formats d'étiquette disponibles et les règles d'assurance applicables.",
      "针对给定的收寄地址与包裹列表，返回可用承运商及其价格、时效、可选面单尺寸和适用的保险规则。"),
  ],
  table:{cols:"params", rows:[
    ...ACCOUNT,
    ["carriers",              Y, "object", t("Corps de la requête. Un objet vide retourne les informations de base de tous les transporteurs.","请求正文。传空对象则返回所有承运商的基本信息。")],
    ["carriers/is_insurance", N, "int",    t("1 pour inclure le calcul de la prime d'assurance dans la réponse.","填 1 时在返回中包含保险费计算。")],
    ["carriers/parcels",           Y, "array", t("Liste des colis","包裹明细")],
    ["carriers/parcels/weight",    Y, "float", t("Poids en kg","包裹重量，单位 kg")],
    ["carriers/parcels/length",    N, "float", t("Longueur en cm","包裹长度，单位 cm")],
    ["carriers/parcels/width",     N, "float", t("Largeur en cm","包裹宽度，单位 cm")],
    ["carriers/parcels/height",    N, "float", t("Hauteur en cm","包裹高度，单位 cm")],
    ["carriers/parcels/amount",    N, "float", t("Valeur déclarée en euros. Obligatoire pour obtenir une prime d'assurance.","申报价值，单位欧元。需要计算保险费时必填。")],
    ["carriers/senderAddress",   Y, "object", t("Adresse d'expédition","寄件人地址")],
    ...addr("carriers/senderAddress","s"),
    ["carriers/receiverAddress", Y, "object", t("Adresse de livraison","收件人地址")],
    ...addr("carriers/receiverAddress","r").filter(r=>!/idCard|save_in_address_book/.test(r[0])),
  ]},
  blocks:[
    {h:t("Requête","请求示例"), code:
`{
  "carriers": {
    "is_insurance": 1,
    "parcels": [
      {"weight": 2, "length": 12, "width": 32, "height": 23, "amount": 100},
      {"weight": 3, "length": 11, "width": 33, "height": 88}
    ],
    "senderAddress": {
      "firstName": "Jessica", "lastName": "Smith",
      "companyName": "SMITH HOUSE", "countryCode": "FR",
      "city": "AUBERVILLIERS", "street": "8-10 RUE DE LA HAIE COQ",
      "postalCode": "93300", "phoneNumber": "0148342502"
    },
    "receiverAddress": {
      "firstName": "yangyang", "lastName": "xiao",
      "companyName": "TEST COMPANY", "countryCode": "DK",
      "city": "COPENHAGEN", "street": "OSTERBROGAGE 114 2ND",
      "postalCode": "2100", "phoneNumber": "004531905171"
    }
  }
}`},
    {h:t("Réponse","返回示例"), code:
`{
  "success": true,
  "carriers": [
    {
      "id": 39,
      "code": "ups",
      "name": "UPS Multi-colis",
      "logo": "https://www.37-express.com/xxxxxx.jpg",
      "timeLimit": "2-6 Jours",
      "allow_buy_insurance": true,
      "insurance_total_ht": 12,
      "insurance_rules": [
        {"price_type": "1", "label": "12 euros (jusqu'à 1000 euros de couverture)",
         "coverage": "0-1000", "price": "12", "min": "0", "max": "1000"}
      ],
      "totals": {
        "1": {"code": "shipping",    "title": "Frais de port", "value": 3.8},
        "5": {"code": "subtotal",    "title": "Total HT",      "value": 3.8},
        "6": {"code": "tax",         "title": "TVA",           "value": 0.76},
        "7": {"code": "grand_total", "title": "Total TTC",     "value": 4.56}
      }
    },
    {
      "id": 12,
      "code": "gls",
      "name": "GLS",
      "timeLimit": "3 Jours",
      "allow_buy_insurance": true,
      "insurance_total_ht": 0.4,
      "insurance_rules": [
        {"price_type": "2", "label": "4% (jusqu'à 2000 euros de couverture)",
         "coverage": "1-2000", "price": "0.4", "min": "1", "max": "2000"}
      ],
      "totals": {
        "1": {"code": "shipping",    "title": "Frais de port", "value": 3.8},
        "5": {"code": "subtotal",    "title": "Total HT",      "value": 3.8},
        "6": {"code": "tax",         "title": "TVA",           "value": 0.76},
        "7": {"code": "grand_total", "title": "Total TTC",     "value": 4.56}
      }
    },
    {
      "id": 6,
      "code": "chronopost",
      "name": "Chrono 13",
      "timeLimit": "2-6 Jours",
      "allow_buy_insurance": false,
      "insurance_rules": [],
      "totals": {}
    }
  ]
}`},
  ],
  table2:{h:t("Champs de la réponse","返回字段"), cols:"ret", rows:[
    ["code",                "string", t("Identifiant textuel du transporteur. C'est cette valeur qu'il faut reporter dans createShipment/carrier.","承运商文本标识。创建运单时 createShipment/carrier 应填此值。")],
    ["name",                "string", t("Libellé commercial du service","服务的商业名称")],
    ["logo",                "string", t("URL du logo du transporteur","承运商 logo 地址")],
    ["timeLimit",           "string", t("Délai annoncé, sous forme de texte libre","时效，自由文本")],
    ["allow_buy_insurance", "bool",   t("Le transporteur accepte une assurance sur cet envoi","该承运商是否允许为本次寄件投保")],
    ["insurance_total_ht",  "number", t("Prime d'assurance hors taxes calculée pour les colis transmis","根据所传包裹计算出的保险费（不含税）")],
    ["insurance_rules",     "array",  t("Barème applicable. price_type vaut 1 pour un montant fixe, 2 pour un pourcentage.","适用费率表。price_type 为 1 表示固定金额，2 表示百分比。")],
    ["totals",              "object", t("Ventilation tarifaire, indexée par un identifiant de ligne. Les lignes utiles sont shipping, subtotal, tax et grand_total ; identifiez-les par leur champ code, jamais par la clé numérique.","价格明细，按行 ID 索引。有效行为 shipping、subtotal、tax、grand_total；请通过 code 字段识别，切勿依赖数字键。")],
    ["label_size_options",  "array",  t("Formats d'étiquette proposés par ce transporteur. Reportez value dans createShipment/labelSize.","该承运商可选的面单尺寸。将 value 填入 createShipment/labelSize。")],
  ]},
  notes:[
    ["info", t("Cet appel détermine qui dessert l'adresse","本接口决定谁能送达该地址"),
      t("La liste retournée tient compte du pays et du code postal de destination, du poids et des dimensions. Un transporteur absent de la réponse ne dessert pas cet envoi : ne le proposez pas à votre client et ne tentez pas la création, elle sera refusée. Appelez donc le devis à chaque expédition plutôt que de filtrer sur une table de pays figée — le réseau évolue sans que votre code en soit informé.",
        "返回列表已根据目的地国家与邮编、包裹重量与尺寸筛选。未出现在返回中的承运商即无法承运本次寄件：请勿向客户展示，也不要尝试创建运单，系统会拒绝。因此请在每次寄件时调用报价，而不要依据硬编码的国家表过滤 —— 网络覆盖会变化，而您的代码不会自动获知。")],
    ["warn", t("Les identifiants numériques ne sont pas fiables","数字 ID 不可靠"),
      t("Le champ id retourné ne correspond pas aux tables d'identifiants publiées par le passé. Utilisez exclusivement le champ code pour désigner un transporteur.",
        "返回的 id 字段与以往发布的 ID 对照表并不一致。请仅使用 code 字段指定承运商。")],
  ],
},

/* --------------------------------------------------- 4. CREER BORDEREAU */
{
  id:"bordereau", group:t("Expédier","寄件"),
  nav:t("Créer un bordereau","创建运单"),
  verb:"POST", path:"createShipment", stamp:["alert",t("Facturé","计费")],
  title:t("Créer un bordereau d'envoi","创建运单"),
  paras:[
    t("Crée l'envoi, réserve le numéro de suivi auprès du transporteur et retourne l'étiquette. L'appel est facturé.",
      "创建寄件、向承运商申请跟踪单号并返回面单。本次调用会产生费用。"),
  ],
  table:{cols:"params", rows:[
    ...ACCOUNT,
    ["createShipment",                     Y, "object", t("Corps de la requête","请求正文")],
    ["createShipment/carrier",             Y, "string", t("Code du transporteur, repris du champ code d'un devis obtenu pour ces deux adresses. La table des transporteurs sert de référence, mais seul le devis garantit que le transporteur dessert la destination.","承运商代码，取自针对同一收寄地址所获报价中的 code 字段。承运商对照表仅供参考，只有报价能确认该承运商可寄达目的地。")],
    ["createShipment/platformOrderNumber", Y, "string", t("Votre référence unique de commande. Sert de clé de rapprochement dans les recaps de facturation.","您的唯一订单参考号。用于对账时的匹配键。")],
    ["createShipment/createTrackingNumber",N, "bool",   t("Demander la réservation du numéro de suivi et de l'étiquette. Vrai par défaut si le champ est absent.","是否申请跟踪单号与面单。字段缺省时默认为真。")],
    ["createShipment/getPdfFile",          N, "bool",   t("Inclure le PDF encodé dans la réponse. Vrai par défaut. Le PDF étant volumineux, passer à faux accélère nettement l'appel : récupérez l'étiquette plus tard via pdfUrl. Sans effet si createTrackingNumber est faux.","是否在返回中包含 BASE64 编码的 PDF。默认为真。PDF 体积较大，设为假可显著加快响应，之后可通过 pdfUrl 获取面单。当 createTrackingNumber 为假时本参数无效。")],
    ["createShipment/notPrintReceipt",     N, "int",    t("1 pour ne pas générer le récépissé. Seule la valeur 1 est interprétée.","填 1 表示不打印凭证。仅识别数值 1。")],
    ["createShipment/labelSize",           N, "string", t("Format d'étiquette. Reprendre une valeur de label_size_options retournée par l'appel de devis.","面单尺寸。取报价接口返回的 label_size_options 中的 value。"), "added"],
    ["createShipment/category",            N, "int",    t("Nature du contenu. 1 cadeau, 2 échantillon commercial, 3 envoi commercial (défaut), 4 document, 5 autre, 6 effets personnels. La valeur 6 est refusée pour un envoi effectué au nom d'une société.","包裹类别。1 礼品，2 商业样板，3 商业快件（默认），4 文件，5 其它，6 个人物品。以公司名义寄件时不允许使用 6。")],
    ["createShipment/originCountry",       N, "string", t("Pays d'origine des marchandises, code pays, ex. US","货物原产国，填国家代码，例：US")],
    ["createShipment/invoiceFile",         N, "string", t("Facture jointe au format pdf, jpg ou png, encodée en BASE64","随附发票（pdf / jpg / png），须为 BASE64 编码字符串")],
    ["createShipment/invoiceFileType",     N, "string", t("Type du fichier de facture : pdf, jpg ou png. Vide équivaut à pdf.","发票文件类型：pdf、jpg 或 png。留空视为 pdf。")],
    ["createShipment/invoiceNumber",       N, "string", t("Numéro de facture","发票号")],
    ["createShipment/invoiceDate",         N, "string", t("Date de facture au format YYYY-MM-DD","发票日期，格式 YYYY-MM-DD")],
    ["createShipment/delivery_instructions", N, "string", t("Consignes de livraison transmises au transporteur","传递给承运商的送货说明")],
    ["createShipment/senderType",          N, "int",    t("1 commande rapide, 2 commande personnalisée (défaut). Utilisé uniquement sur la ligne Colissimo International.","1 快捷下单，2 自定义下单（默认）。仅用于 Colissimo International 专线。")],
    ["createShipment/parcels",             Y, "array",  t("Liste des colis","包裹明细")],
    ["createShipment/parcels/weight",      Y, "float",  t("Poids en kg","包裹重量，单位 kg")],
    ["createShipment/parcels/length",      N, "float",  t("Longueur en cm","包裹长度，单位 cm")],
    ["createShipment/parcels/width",       N, "float",  t("Largeur en cm","包裹宽度，单位 cm")],
    ["createShipment/parcels/height",      N, "float",  t("Hauteur en cm","包裹高度，单位 cm")],
    ["createShipment/parcels/amount",      N, "float",  t("Valeur déclarée du colis en euros. Renseigner une valeur supérieure à 0 déclenche la souscription de l'assurance et sa facturation automatique. Laisser à 0 pour un envoi non assuré.","包裹申报价值，单位欧元。填写大于 0 的值将自动投保并计费。不投保请填 0。"), "fixed"],
    ["createShipment/parcels/articles",              N, "array",  t("Contenu du colis. Obligatoire pour tout envoi soumis à déclaration douanière.","包裹内物品。需报关的寄件必填。")],
    ["createShipment/parcels/articles/description",  Y, "string", t("Désignation de l'article","物品名称")],
    ["createShipment/parcels/articles/quantity",     Y, "int",    t("Quantité de cet article","该物品数量")],
    ["createShipment/parcels/articles/value",        Y, "float",  t("Valeur unitaire en euros","单件物品价值，单位 EUR")],
    ["createShipment/parcels/articles/weight",       Y, "float",  t("Poids unitaire en kg","单件物品重量，单位 kg")],
    ["createShipment/parcels/articles/hsCode",       Y, "string", t("Code douanier de l'article. Utilisez la recherche de codes douaniers pour l'obtenir.","物品海关税号。可使用海关税号查询接口获取。")],
    ["createShipment/parcels/articles/originCountry",N, "string", t("Pays d'origine de l'article, ex. FR","物品原产国，例：FR")],
    ["createShipment/parcels/articles/brand",        N, "string", t("Marque","品牌")],
    ["createShipment/parcels/articles/spec",         N, "string", t("Spécifications","规格")],
    ["createShipment/parcels/articles/barcode",      N, "string", t("Code-barres","条形码")],
    ["createShipment/senderAddress",   Y, "object", t("Adresse d'expédition","寄件人地址")],
    ...addr("createShipment/senderAddress","s"),
    ["createShipment/receiverAddress", Y, "object", t("Adresse de livraison","收件人地址")],
    ...addr("createShipment/receiverAddress","r"),
    ["createShipment/pointAddress", N, "object", t("Point relais générique, hors UPS et Mondial Relay","通用驿站，UPS 与 Mondial Relay 除外")],
    ...relay("createShipment/pointAddress","", N, t("Identifiant du point relais. Non requis pour les points UPS.","驿站 ID。UPS 驿站无需填写。")),
    ["createShipment/pointAddress/relay_point_distance", N, "string", t("Distance au point relais en mètres","距驿站距离（米）")],
    ["createShipment/upsAccessPointAddress", N, "object", t("Point relais UPS Access Point","UPS 驿站地址")],
    ...relay("createShipment/upsAccessPointAddress","UPS", N, t("Non requis pour les points UPS.","UPS 驿站无需填写。")).slice(1),
    ["createShipment/mondialrelayPointAddress", N, "object", t("Point relais Mondial Relay","Mondial Relay 驿站地址")],
    ...relay("createShipment/mondialrelayPointAddress","Mondial Relay", Y, t("Identifiant Mondial Relay, obligatoire.","Mondial Relay 驿站 ID，必填。")),
    ["createShipment/mondialrelayPointAddress/relay_point_distance", N, "string", t("Distance au point relais en mètres","距驿站距离（米）")],
    ["createShipment/appointmentPickup", N, "object", t("Enlèvement à domicile à programmer dès la création. Un enlèvement peut aussi être demandé après coup.","创建时同步预约上门取件。也可在创建之后单独预约。")],
    ...pickup("createShipment/appointmentPickup"),
  ]},
  blocks:[
    {h:t("Requête","请求示例"), code:
`{
  "createShipment": {
    "carrier": "ups_access_point",
    "platformOrderNumber": "A-12345678",
    "createTrackingNumber": true,
    "getPdfFile": true,
    "parcels": [
      {"weight": 2, "length": 12, "width": 32, "height": 23, "articles": [
        {"description": "Cadeaux Personnels", "quantity": 2,
         "value": 12, "weight": 1, "hsCode": "38000000"}
      ]},
      {"weight": 3, "length": 11, "width": 33, "height": 88, "articles": [
        {"description": "Vêtements", "quantity": 1,
         "value": 10, "weight": 1.5, "hsCode": "61000000"},
        {"description": "Vêtements", "quantity": 1,
         "value": 20, "weight": 1.5, "hsCode": "61000000"}
      ]}
    ],
    "senderAddress": {
      "firstName": "Jessica", "lastName": "Smith",
      "companyName": "SMITH HOUSE", "countryCode": "FR",
      "city": "AUBERVILLIERS", "street": "8-10 RUE DE LA HAIE COQ",
      "postalCode": "93300", "phoneNumber": "0148342502"
    },
    "receiverAddress": {
      "firstName": "yangyang", "lastName": "xiao",
      "companyName": "TEST COMPANY", "countryCode": "DK",
      "city": "COPENHAGEN", "street": "OSTERBROGAGE 114 2ND",
      "postalCode": "2100", "phoneNumber": "004531905171"
    },
    "upsAccessPointAddress": {
      "name": "TABAC PRESSE CARPE DIEM", "countryCode": "FR",
      "city": "AJACCIO", "street": "27 BOULEVARD DOMINIQUE PAOLI",
      "postalCode": "20090"
    }
  }
}`},
    {h:t("Réponse","返回示例"), code:
`{
  "success": true,
  "createShipment": {
    "incrementId": 78284091,
    "pdfUrlToken": "jdfhjdf84387hs7shdjk82h83jad0oe5",
    "pdfUrl": "${B}/api/parcel/print/increment_id/78284091/token/jdfhjdf84387hs7shdjk82h83jad0oe5/",
    "trackingNumber": ["1Z6660YVYZ96488032", "1Z6660YVYZ98316053"],
    "pdfContent": "BASE64"
  }
}`},
  ],
  table2:{h:t("Champs de la réponse","返回字段"), cols:"ret", rows:[
    ["incrementId",    "string", t("Numéro de bordereau. À conserver : il sert à récupérer l'étiquette, programmer un enlèvement, annuler ou consulter le suivi.","运单编号。请妥善保存：获取面单、预约取件、取消订单及查询轨迹均需使用。")],
    ["pdfUrlToken",    "string", t("Jeton d'impression associé au bordereau","面单打印令牌")],
    ["pdfUrl",         "string", t("Lien d'impression de l'étiquette. Le lien donne accès aux coordonnées du destinataire : ne le diffusez pas au-delà des personnes qui doivent imprimer le colis.","面单打印链接。该链接可访问收件人信息，请勿超出打印所需人员范围传播。")],
    ["trackingNumber", "array",  t("Numéros de suivi du transporteur, un par colis. Présent seulement si createTrackingNumber vaut vrai.","承运商跟踪单号，每个包裹一个。仅当 createTrackingNumber 为真时返回。")],
    ["pdfContent",     "string", t("Étiquette encodée en BASE64. Présente seulement si createTrackingNumber et getPdfFile valent vrai.","BASE64 编码的面单内容。仅当 createTrackingNumber 与 getPdfFile 均为真时返回。")],
  ]},
  notes:[
    ["alert", t("Rejouer une requête crée un second envoi facturé","重复提交会生成第二笔计费寄件"),
      t("Le comportement en cas de platformOrderNumber déjà utilisé n'est pas garanti à ce jour. En cas de délai d'attente dépassé, ne rejouez pas l'appel : vérifiez d'abord l'existence du bordereau via le détail de commande.",
        "目前尚不保证 platformOrderNumber 重复时的行为。若请求超时，请勿直接重发：先通过订单详情接口确认运单是否已生成。")],
    ["warn", t("Renseigner amount déclenche la facturation de l'assurance","填写 amount 将触发保险计费"),
      t("Sur parcels/amount, toute valeur supérieure à 0 souscrit l'assurance et la facture selon le barème du transporteur. Pour déclarer une valeur douanière sans assurer le colis, renseignez les valeurs au niveau des articles et laissez amount à 0.",
        "在 parcels/amount 中填写任何大于 0 的值都会按承运商费率投保并计费。若只需申报海关价值而不投保，请在 articles 层级填写价值并将 amount 保持为 0。")],
  ],
},

/* ---------------------------------------------------------- 5. ETIQUETTE */
{
  id:"etiquette", group:t("Expédier","寄件"),
  nav:t("Récupérer l'étiquette","获取面单"),
  verb:"POST", path:"label", stamp:["ok",t("Stable","稳定")],
  title:t("Récupérer le numéro de suivi et l'étiquette","获取快递单号和面单"),
  paras:[
    t("À utiliser quand la création du bordereau a été demandée sans étiquette, ou pour réimprimer. Inutile si createShipment a déjà retourné le PDF.",
      "适用于创建运单时未请求面单，或需要重新打印的情况。若 createShipment 已返回 PDF 则无需调用。"),
  ],
  table:{cols:"params", rows:[
    ...ACCOUNT,
    ["label",             Y, "object", t("Corps de la requête","请求正文")],
    ["label/incrementId", Y, "string", t("Numéro de bordereau retourné par createShipment","createShipment 返回的运单编号")],
  ]},
  blocks:[
    {h:t("Requête","请求示例"), code:
`{ "label": { "incrementId": "78284091" } }`},
    {h:t("Réponse","返回示例"), code:
`{
  "success": true,
  "label": {
    "pdfUrlToken": "jdfhjdf84387hs7shdjk82h83jad0oe5",
    "pdfUrl": "${B}/api/parcel/print/increment_id/78284091/token/jdfhjdf84387hs7shdjk82h83jad0oe5/",
    "trackingNumber": ["1Z6660YVYZ96488032", "1Z6660YVYZ98316053"],
    "pdfContent": "BASE64"
  }
}`},
  ],
  table2:{h:t("Champs de la réponse","返回字段"), cols:"ret", rows:[
    ["pdfUrlToken",    "string", t("Jeton d'impression associé au bordereau","面单打印令牌")],
    ["pdfUrl",         "string", t("Lien d'impression de l'étiquette","面单打印链接")],
    ["trackingNumber", "array",  t("Numéros de suivi du transporteur, un par colis","承运商跟踪单号，每个包裹一个")],
    ["pdfContent",     "string", t("Étiquette encodée en BASE64","BASE64 编码的面单内容")],
  ]},
},

/* -------------------------------------------------------- 6. ORDERDETAIL */
{
  id:"detail", group:t("Expédier","寄件"),
  nav:t("Détail d'une commande","订单详情"),
  verb:"POST", path:"orderDetail", stamp:["new",t("Absent de la doc FR","法语版缺失")],
  title:t("Consulter le détail d'une commande","查询订单详情"),
  paras:[
    t("Retourne l'intégralité d'un envoi : adresses, colis, articles, statut et ventilation tarifaire. C'est l'appel à privilégier pour vérifier qu'un bordereau existe avant de rejouer une création.",
      "返回一笔寄件的完整信息：地址、包裹、物品、状态与价格明细。在重发创建请求前，建议先用本接口确认运单是否已存在。"),
  ],
  table:{cols:"params", rows:[
    ...ACCOUNT,
    ["orderDetail",             Y, "object", t("Corps de la requête","请求正文")],
    ["orderDetail/incrementId", Y, "string", t("Numéro de bordereau à consulter","要查询的运单编号")],
  ]},
  blocks:[{h:t("Réponse","返回示例"), code:
`{
  "success": true,
  "orderDetail": {
    "increment_id": "QY600265581",
    "status": "…",
    "senderAddress":   { "…" },
    "receiverAddress": { "…" },
    "parcels": [ { "weight": 1, "amount": 0, "articles": { "…" } } ],
    "payment_method": "…",
    "totals": {
      "5": {"code": "subtotal",    "value": "14.8600"},
      "6": {"code": "tax",         "value": null},
      "7": {"code": "grand_total", "value": "17.8300"}
    }
  }
}`}],
  notes:[
    ["warn", t("Le format des champs diffère des autres appels","字段格式与其他接口不一致"),
      t("Trois écarts à prévoir côté client : le champ s'appelle increment_id et non incrementId ; sa valeur est préfixée alors que createShipment retourne un entier nu ; articles est ici un objet là où createShipment attend un tableau. Les montants sont des chaînes à quatre décimales et status comme payment_method sont des libellés traduits, non des codes.",
        "客户端需注意三处差异：字段名为 increment_id 而非 incrementId；其值带前缀，而 createShipment 返回的是纯数字；此处 articles 为对象，而 createShipment 中为数组。金额为四位小数的字符串，status 与 payment_method 为已翻译的文案而非稳定代码。")],
  ],
},

/* -------------------------------------------------------------- 7. SUIVI */
{
  id:"suivi", group:t("Suivre","跟踪"),
  nav:t("Suivi des colis","物流跟踪"),
  verb:"POST", path:"traces", stamp:["ok",t("Stable","稳定")],
  title:t("Obtenir les informations de suivi","获取物流跟踪信息"),
  paras:[
    t("Retourne l'historique des événements transporteur pour un ou plusieurs colis.",
      "返回一个或多个包裹的承运商轨迹记录。"),
  ],
  table:{cols:"params", rows:[
    ...ACCOUNT,
    ["traces",                Y, "object", t("Corps de la requête","请求正文")],
    ["traces/trackingNumber", N, "array | string", t("Numéros de suivi transporteur. 10 au maximum par appel. Exclusif avec incrementId : renseignez l'un ou l'autre, jamais les deux.","承运商跟踪单号。每次调用最多 10 个。与 incrementId 互斥：二者填其一，不可同时填写。")],
    ["traces/incrementId",    N, "array | string", t("Numéros de bordereau 37 Express. Exclusif avec trackingNumber.","37 Express 运单编号。与 trackingNumber 互斥。")],
    ["test",                  N, "string", t("1 pour recevoir un jeu de données de suivi factice, utile en recette.","填 1 返回测试轨迹数据，便于联调。")],
  ]},
  blocks:[
    {h:t("Requête","请求示例"), code:
`{
  "traces": {
    "trackingNumber": ["1Z6660YVYZ96488032", "1Z6660YVYZ98316053"]
  }
}`},
    {h:t("Réponse","返回示例"), code:
`{
  "success": true,
  "traces": [
    {
      "trackingNumber": "1Z6660YVYZ96488032",
      "tracks": [
        {"context": "…", "time": "2016-09-06 13:34:00"},
        {"context": "…", "time": "2016-09-07 13:34:00"}
      ]
    }
  ]
}`},
  ],
  table2:{h:t("Champs de la réponse","返回字段"), cols:"ret", rows:[
    ["trackingNumber", "string", t("Numéro de suivi du transporteur","承运商跟踪单号")],
    ["tracks",         "array",  t("Historique des événements, du plus ancien au plus récent","轨迹集合，按时间先后排列")],
    ["tracks/time",    "string", t("Horodatage de l'événement, format YYYY-MM-DD HH:MM:SS","事件时间，格式 YYYY-MM-DD HH:MM:SS")],
    ["tracks/context", "string", t("Libellé de l'événement, tel que fourni par le transporteur","事件描述，由承运商原样提供")],
  ]},
  notes:[
    ["info", t("Un seul numéro se transmet aussi en chaîne","单个单号也可直接传字符串"),
      t("trackingNumber accepte indifféremment une chaîne ou un tableau de chaînes.",
        "trackingNumber 可传字符串，也可传字符串数组。")],
  ],
},

/* ---------------------------------------------------------- 8. ENLEVEMENT */
{
  id:"enlevement", group:t("Enlèvement","上门取件"),
  nav:t("Programmer un enlèvement","预约上门取件"),
  verb:"POST", path:"appointmentPickup", stamp:["ok",t("Stable","稳定")],
  title:t("Programmer un enlèvement à domicile","预约上门取件"),
  paras:[
    t("Demande le passage d'un chauffeur pour un bordereau déjà créé. Le bordereau doit exister au préalable.",
      "为已创建的运单预约司机上门。必须先创建运单。"),
  ],
  table:{cols:"params", rows:[
    ...ACCOUNT,
    ["appointmentPickup",             Y, "object", t("Corps de la requête","请求正文")],
    ["appointmentPickup/incrementId", Y, "string", t("Numéro de bordereau retourné par createShipment","createShipment 返回的运单编号")],
    ["appointmentPickup/appointment", N, "object", t("Adresse et date d'enlèvement. À omettre pour conserver celles déjà enregistrées sur le bordereau.","上门地址与日期。若沿用运单上已有的信息，可不传。")],
    ...pickup("appointmentPickup/appointment"),
  ]},
  blocks:[
    {h:t("Requête","请求示例"), code:
`{ "appointmentPickup": { "incrementId": "78284091" } }`},
    {h:t("Réponse","返回示例"), code:
`{ "success": true, "appointmentPickup": { "status": 3 } }`},
  ],
  table2:{h:t("Valeurs de status","status 取值"), cols:"ret", rows:[
    ["1", "int", t("Demande en attente de soumission au transporteur","等待提交申请")],
    ["2", "int", t("Demande soumise, en attente de validation","等待审核")],
    ["3", "int", t("Demande acceptée, enlèvement programmé","提交成功，等待上门")],
  ]},
},

/* ------------------------------------------------------------ 9. ANNULER */
{
  id:"annuler", group:t("Enlèvement","上门取件"),
  nav:t("Annuler","取消"),
  verb:"POST", path:"cancelOrder · cancelPickup", stamp:["ok",t("Stable","稳定")],
  title:t("Annuler une commande ou un enlèvement","取消订单或上门预约"),
  paras:[
    t("Deux opérations distinctes : cancelOrder annule le bordereau, cancelPickup annule uniquement le passage du chauffeur en laissant le bordereau actif.",
      "两个独立操作：cancelOrder 取消运单，cancelPickup 仅取消上门取件而保留运单。"),
  ],
  table:{cols:"params", rows:[
    ...ACCOUNT,
    ["cancelOrder",              N, "object", t("Annulation du bordereau","取消运单")],
    ["cancelOrder/incrementId",  Y, "string", t("Numéro de bordereau à annuler","要取消的运单编号")],
    ["cancelPickup",             N, "object", t("Annulation de l'enlèvement seul","仅取消上门预约")],
    ["cancelPickup/incrementId", Y, "string", t("Numéro de bordereau dont l'enlèvement doit être annulé. Pris en charge sur UPS uniquement à ce jour.","需取消上门预约的运单编号。目前仅支持 UPS。")],
  ]},
  blocks:[
    {h:t("Annuler le bordereau","取消运单"), code:
`{ "cancelOrder": { "incrementId": "78284091" } }

// réponse
{
  "success": true,
  "cancelOrder": "#XXX Commande annulée avec succès"
}`},
    {h:t("Annuler l'enlèvement seul","仅取消上门预约"), code:
`{ "cancelPickup": { "incrementId": "78284091" } }

// réponse
{
  "success": true,
  "cancelPickup": "#XXX L'enlèvement est annulé."
}`},
  ],
  notes:[
    ["warn", t("Deux opérations, deux requêtes","两个操作，两次请求"),
      t("N'envoyez qu'une seule clé racine par appel. cancelOrder et cancelPickup ne se combinent pas dans le même corps de requête.",
        "每次调用只发送一个根键。cancelOrder 与 cancelPickup 不可放在同一请求体中。")],
  ],
},

/* -------------------------------------------------------- 10. POINTS RELAIS */
{
  id:"relais", group:t("Réseau","网络"),
  nav:t("Points relais","搜索驿站"),
  verb:"POST", path:"searchParcelShop", stamp:["warn",t("Deux formats","两种格式")],
  title:t("Rechercher des points relais","搜索驿站"),
  paras:[
    t("Retourne les points relais disponibles autour d'un code postal pour un service donné.",
      "返回指定服务在某邮编周边可用的驿站。"),
  ],
  table:{cols:"params", rows:[
    ...ACCOUNT,
    ["searchParcelShop",              Y, "object", t("Corps de la requête","请求正文")],
    ["searchParcelShop/service_code", Y, "string", t("chronopost ou mondialrelay","chronopost 或 mondialrelay")],
    ["searchParcelShop/CountryCode",  Y, "string", t("Code pays, ex. FR","国家代码，例：FR")],
    ["searchParcelShop/PostCode",     Y, "string", t("Code postal","邮编")],
    ["searchParcelShop/City",         N, "string", t("Ville. Pris en compte sur chronopost uniquement.","城市。仅 chronopost 支持。")],
  ]},
  blocks:[
    {h:t("Requête","请求示例"), code:
`{
  "searchParcelShop": {
    "service_code": "chronopost",
    "CountryCode": "FR",
    "PostCode": "75001"
  }
}`},
    {h:t("Réponse — chronopost","返回示例 — chronopost"), code:
`{
  "success": true,
  "searchParcelShop": [
    {
      "identifiant": "9835U",
      "nom": "MARIA",
      "adresse1": "58 rue de l Arbre Sec",
      "adresse2": "",
      "codePostal": "75001",
      "localite": "PARIS",
      "codePays": "FR",
      "coordGeolocalisationLatitude": "48.86113710000",
      "coordGeolocalisationLongitude": "2.34258780000",
      "distanceEnMetre": 284,
      "poidsMaxi": 20,
      "typeDePoint": "P",
      "actif": true,
      "accesPersonneMobiliteReduite": true,
      "listeHoraireOuverture": [
        {
          "jour": 1,
          "horairesAsString": "11:30-15:00 15:30-22:30",
          "listeHoraireOuverture": [
            {"debut": "11:30", "fin": "15:00"},
            {"debut": "15:30", "fin": "22:30"}
          ]
        }
      ],
      "urlGoogleMaps": "http://maps.google.fr/maps?q=48.86113710000,2.34258780000"
    }
  ]
}`},
    {h:t("Réponse — mondialrelay","返回示例 — mondialrelay"), code:
`{
  "success": true,
  "searchParcelShop": [
    {
      "ParcelShopId": "000001",
      "Name": "PARIS 1 MY AUCHAN",
      "Adress1": "20 PLACE DU MARCHE SAINT-HONORE",
      "Adress2": "SAINT HONORE",
      "PostCode": "75001",
      "City": "PARIS",
      "CountryCode": "FR",
      "Latitude": "48,8662010",
      "Longitude": "02,3317568",
      "LocalisationDetails": "",
      "ActivityCode": "000",
      "OpeningHours": {
        "Monday": {
          "OpenAMAt": "0800", "CloseAMAt": "1200",
          "OpenPMAt": "1400", "ClosePMAt": "2000", "Closed": null
        }
      },
      "ClosedPeriods": null,
      "PictureUrl": "",
      "MapUrl": ""
    }
  ]
}`},
  ],
  notes:[
    ["alert", t("La réponse n'a pas le même schéma selon le service","返回结构随服务而不同"),
      t("Les données sont relayées telles que le transporteur les fournit. Avec chronopost, les champs sont en français : nom, adresse1, codePostal, coordGeolocalisationLatitude, listeHoraireOuverture. Avec mondialrelay, ils sont en anglais et la latitude arrive sous forme de chaîne à virgule décimale : Name, Adress1, PostCode, Latitude « 48,8662010 », OpeningHours. Prévoyez deux traitements distincts côté client tant qu'un schéma unifié n'est pas en place. Les exemples ci-contre ne montrent qu'un jour d'ouverture et qu'un point relais : la réponse réelle en contient sept et plusieurs.",
        "数据按承运商原样透传。chronopost 返回法语字段：nom、adresse1、codePostal、coordGeolocalisationLatitude、listeHoraireOuverture。mondialrelay 返回英语字段，且纬度为使用逗号作小数点的字符串：Name、Adress1、PostCode、Latitude「48,8662010」、OpeningHours。在统一结构上线之前，客户端需分别处理这两种格式。右侧示例仅展示一个营业日与一个驿站，实际返回包含七天与多个驿站。")],
  ],
},

/* -------------------------------------------------------------- 11. DOUANE */
{
  id:"douane", group:t("Réseau","网络"),
  nav:t("Codes douaniers","海关税号"),
  verb:"POST", path:"customs", stamp:["ok",t("Stable","稳定")],
  title:t("Rechercher un code douanier","查询海关税号"),
  paras:[
    t("Recherche dans la nomenclature douanière à partir d'un libellé. Utilisez systématiquement cette recherche pour alimenter articles/hsCode : la classification engage la responsabilité de l'expéditeur en cas de contrôle.",
      "按名称在海关商品目录中检索。请始终通过本接口获取 articles/hsCode：一旦被查验，归类责任由寄件人承担。"),
  ],
  table:{cols:"params", rows:[
    ...ACCOUNT,
    ["customs",   Y, "object", t("Corps de la requête","请求正文")],
    ["customs/q", Y, "string", t("Terme recherché, 2 caractères minimum","搜索词，至少 2 个字符")],
  ]},
  blocks:[{h:t("Réponse","返回示例"), code:
`{
  "success": true,
  "customs": [
    {"id": "102",  "parent_id": "0",   "name": "Malt, même torréfié", "hs_code": "1107"},
    {"id": "2648", "parent_id": "102", "name": "non torréfié",        "hs_code": "110710"}
  ]
}`}],
  notes:[
    ["warn", t("La longueur du code varie selon le niveau retourné","返回的税号位数随层级变化"),
      t("La recherche retourne des codes à 4 ou 6 chiffres selon la profondeur de la position. Descendez jusqu'au niveau attendu par la destination avant de reporter la valeur dans hsCode. Les tables de correspondance simplifiées qui ont circulé par le passé ne doivent pas servir de référence.",
        "检索结果按层级深度返回 4 位或 6 位税号。请下钻至目的地要求的层级后再填入 hsCode。以往流传的简易对照表不应作为依据。")],
  ],
},

/* ------------------------------------------------------------ 12. ADRESSES */
{
  id:"adresses", group:t("Réseau","网络"),
  nav:t("Carnet d'adresses","地址簿"),
  verb:"POST", path:"address · addressFields · country", stamp:["new",t("2 absents de la doc FR","2 项法语版缺失")],
  title:t("Carnet d'adresses et référentiels","地址簿与基础数据"),
  paras:[
    t("Trois appels de référence : la liste paginée des adresses enregistrées, la description des champs d'adresse attendus, et la liste des pays desservis.",
      "三个基础数据接口：分页返回已保存地址、返回地址字段定义、返回可寄达国家列表。"),
  ],
  table:{cols:"params", rows:[
    ...ACCOUNT,
    ["address",           N, "object", t("Liste paginée du carnet d'adresses","分页查询地址簿")],
    ["address/page",      Y, "int",    t("Numéro de page, à partir de 1","页码，从 1 开始")],
    ["address/page_size", N, "int",    t("Nombre d'éléments par page. 20 par défaut.","每页数量，默认 20")],
    ["addressFields",     N, "bool",   t("true pour obtenir la description des champs d'adresse attendus","填 true 返回地址字段定义"), "added"],
    ["country",           N, "bool",   t("true pour obtenir la liste des pays desservis. À préférer à toute table de pays figée dans votre code.","填 true 返回可寄达国家列表。建议以此替代代码中硬编码的国家表。"), "added"],
  ]},
  blocks:[{h:t("Réponse de address","address 返回示例"), code:
`{
  "success": true,
  "address": {
    "pagination": {
      "current": 1, "page_size": 20,
      "item_count": 104, "max_number_pages": 6
    },
    "items": [
      {
        "prefix": "Mister", "firstname": "…", "lastname": "…",
        "company": "…", "postcode": "…", "telephone": "…",
        "country": "FR", "country_str": "France",
        "city": "AINAC", "street": "61 Rue de Caire",
        "address_type": "register",
        "address_type_label": "Adresse du siège social"
      }
    ]
  }
}`}],
  notes:[
    ["info", t("Les libellés sont traduits, les codes ne le sont pas","文案会翻译，代码不会"),
      t("country_str et address_type_label suivent la langue du compte. Appuyez vos traitements sur country et address_type.",
        "country_str 与 address_type_label 随账号语言变化。请基于 country 与 address_type 编写逻辑。")],
  ],
},

];

/* ============================================================================
   TABLE DES TRANSPORTEURS
   ========================================================================== */

const CARRIERS = [
  ["colissimo", t("Colissimo sans signature","Colissimo 无签收"),
   t("France",
     "法国")],
  ["colissimo_avec", t("Colissimo avec signature","Colissimo 签收"),
   t("France, Luxembourg, Pays-Bas, Allemagne, Belgique, Autriche, Portugal, Espagne, Irlande, Italie, Danemark, Suède, Estonie, Hongrie, Lettonie, Lituanie, Pologne, Slovaquie, Slovénie, Tchéquie, Liechtenstein, Suisse, Finlande, Grèce, Islande, Malte, Maroc, Norvège, Roumanie, Bulgarie, Chypre, Croatie, Andorre, Monaco, Royaume-Uni (Angleterre, Écosse, Pays de Galles, Irlande du Nord)",
     "法国、卢森堡、荷兰、德国、比利时、奥地利、葡萄牙、西班牙、爱尔兰、意大利、丹麦、瑞典、爱沙尼亚、匈牙利、拉脱维亚、立陶宛、波兰、斯洛伐克、斯洛文尼亚、捷克、列支敦士登、瑞士、芬兰、希腊、冰岛、马耳他、摩洛哥、挪威、罗马尼亚、保加利亚、塞浦路斯、克罗地亚、安道尔、摩纳哥、英国（英格兰、苏格兰、威尔士、北爱尔兰）")],
  ["colissimo_retour", t("Colissimo Retour","Colissimo 退货"),
   t("France",
     "法国")],
  ["colissimo_outside_paris", t("Colissimo Outre-mer avec signature","Colissimo 海外属地签收"),
   t("Guadeloupe, Martinique, La Réunion, Mayotte, Saint-Pierre-et-Miquelon, Saint-Barthélemy, Saint-Martin, Guyane, Nouvelle-Calédonie, Polynésie française, Wallis-et-Futuna, Terres australes françaises",
     "瓜德罗普、马提尼克、留尼汪、马约特、圣皮埃尔和密克隆群岛、圣巴泰勒米、法属圣马丁、法属圭亚那、新喀里多尼亚、法属波利尼西亚、瓦利斯和富图纳、法属南部领地")],
  ["colissimo_inter", t("Colissimo International","法国邮政国际"),
   t("Chine, Taïwan, Hong Kong, Inde, Singapour, Japon, Thaïlande, Australie, Vietnam, Corée du Sud, États-Unis, Canada",
     "中国、中国台湾、中国香港、印度、新加坡、日本、泰国、澳大利亚、越南、韩国、美国、加拿大")],
  ["chronopost", t("Chrono 13","Chrono 13"),
   t("France, Allemagne, Luxembourg, Pays-Bas, Belgique, Espagne, Autriche, Italie, Portugal, Danemark, Suède, Irlande, Estonie, Roumanie, Hongrie, Tchéquie, Pologne, Croatie, Slovénie, Bulgarie, Slovaquie, Finlande, Grèce, Lituanie, Lettonie, Liechtenstein, Suisse, Norvège, Royaume-Uni (Angleterre, Écosse, Pays de Galles, Irlande du Nord)",
     "法国、德国、卢森堡、荷兰、比利时、西班牙、奥地利、意大利、葡萄牙、丹麦、瑞典、爱尔兰、爱沙尼亚、罗马尼亚、匈牙利、捷克、波兰、克罗地亚、斯洛文尼亚、保加利亚、斯洛伐克、芬兰、希腊、立陶宛、拉脱维亚、列支敦士登、瑞士、挪威、英国（英格兰、苏格兰、威尔士、北爱尔兰）")],
  ["chronopost18", t("Chrono 18","Chrono 18"),
   t("France",
     "法国")],
  ["chronopost18_saturday", t("Chrono 18 — livraison le samedi","Chrono 18（周六送货）"),
   t("France",
     "法国")],
  ["chronopost_multi", t("Chrono Multi-Colis","Chrono Multi-Colis"),
   t("France",
     "法国")],
  ["chronopost_multi_saturday", t("Chrono Multi-Colis — livraison le samedi","Chrono Multi-Colis（周六送货）"),
   t("France",
     "法国")],
  ["chrono_relais_13", t("Chrono Relais 13","Chrono Relais 13"),
   t("France",
     "法国")],
  ["chronopost_point", t("Chronopost Shop2Shop","Chronopost Shop2Shop"),
   t("France, Allemagne, Belgique, Luxembourg, Pays-Bas, Autriche, Danemark, Espagne, Finlande, Irlande, Italie, Portugal, Suède, Bulgarie, Croatie, Estonie, Hongrie, Lettonie, Lituanie, Pologne, Tchéquie, Slovaquie, Slovénie",
     "法国、德国、比利时、卢森堡、荷兰、奥地利、丹麦、西班牙、芬兰、爱尔兰、意大利、葡萄牙、瑞典、保加利亚、克罗地亚、爱沙尼亚、匈牙利、拉脱维亚、立陶宛、波兰、捷克、斯洛伐克、斯洛文尼亚")],
  ["chronopost_air", t("Chrono Economy / UPS","Chrono Economy / UPS"),
   t("Canada, États-Unis, Mexique, Porto Rico, Hong Kong, Singapour",
     "加拿大、美国、墨西哥、波多黎各、中国香港、新加坡")],
  ["chronopost_outside_paris", t("Chronopost DOM-TOM","Chronopost 法国海外属地"),
   t("Saint-Barthélemy, Saint-Martin, Guyane, Guadeloupe, La Réunion, Martinique, Mayotte, Polynésie française, Nouvelle-Calédonie, Îles Mariannes du Nord, Wallis-et-Futuna, Saint-Martin (partie néerlandaise), Saint-Pierre-et-Miquelon",
     "圣巴泰勒米、法属圣马丁、法属圭亚那、瓜德罗普、留尼汪、马提尼克、马约特、法属波利尼西亚、新喀里多尼亚、北马里亚纳群岛、瓦利斯和富图纳、荷属圣马丁、圣皮埃尔和密克隆群岛")],
  ["chronopost_frozen", t("DPD Predict B2C","DPD Predict B2C"),
   t("France",
     "法国")],
  ["ups", t("UPS Multi-colis","UPS Multi-colis"),
   t("Belgique, Allemagne, Pays-Bas, Espagne, Luxembourg, Italie, Portugal, Danemark, Irlande, Suède, Finlande, Croatie, Hongrie, Pologne, Slovénie, Slovaquie, Bulgarie, Estonie, Lettonie, Lituanie, Roumanie, Andorre, Liechtenstein, Saint-Marin, Suisse, France, Grèce, Tchéquie, Autriche, Royaume-Uni (Angleterre, Écosse, Pays de Galles, Irlande du Nord)",
     "比利时、德国、荷兰、西班牙、卢森堡、意大利、葡萄牙、丹麦、爱尔兰、瑞典、芬兰、克罗地亚、匈牙利、波兰、斯洛文尼亚、斯洛伐克、保加利亚、爱沙尼亚、拉脱维亚、立陶宛、罗马尼亚、安道尔、列支敦士登、圣马力诺、瑞士、法国、希腊、捷克、奥地利、英国（英格兰、苏格兰、威尔士、北爱尔兰）")],
  ["ups_standard", t("UPS Standard","UPS Standard"),
   t("France, Allemagne, Autriche, Belgique, Espagne, Danemark, Irlande, Italie, Luxembourg, Pays-Bas, Portugal, Finlande, Suède, Croatie, Hongrie, Pologne, Slovaquie, Slovénie, Grèce, Bulgarie, Estonie, Lettonie, Lituanie, Roumanie, Andorre, Liechtenstein, Suisse, Tchéquie, Saint-Marin, Royaume-Uni (Angleterre, Écosse, Pays de Galles, Irlande du Nord)",
     "法国、德国、奥地利、比利时、西班牙、丹麦、爱尔兰、意大利、卢森堡、荷兰、葡萄牙、芬兰、瑞典、克罗地亚、匈牙利、波兰、斯洛伐克、斯洛文尼亚、希腊、保加利亚、爱沙尼亚、拉脱维亚、立陶宛、罗马尼亚、安道尔、列支敦士登、瑞士、捷克、圣马力诺、英国（英格兰、苏格兰、威尔士、北爱尔兰）")],
  ["ups_access_point", t("UPS Access Point","UPS 驿站"),
   t("France",
     "法国")],
  ["ups_intl", t("UPS Express Saver","UPS Express Saver"),
   t("Réseau international le plus large de la plateforme, plus de 190 destinations. Liste trop longue pour être reproduite ici : appelez le devis avec l'adresse réelle.",
     "平台覆盖最广的国际线路，逾 190 个目的地。清单过长，此处不再罗列：请以真实地址调用报价接口。")],
  ["dpd", t("DPD","DPD"),
   t("France, Luxembourg, Pays-Bas, Belgique, Autriche, Espagne, Italie, Danemark, Hongrie, Irlande, Pologne, Portugal, Tchéquie, Slovaquie, Slovénie, Croatie, Estonie, Lettonie, Lituanie, Suède, Finlande, Bulgarie, Roumanie",
     "法国、卢森堡、荷兰、比利时、奥地利、西班牙、意大利、丹麦、匈牙利、爱尔兰、波兰、葡萄牙、捷克、斯洛伐克、斯洛文尼亚、克罗地亚、爱沙尼亚、拉脱维亚、立陶宛、瑞典、芬兰、保加利亚、罗马尼亚")],
  ["gls", t("GLS","GLS"),
   t("France, Belgique, Allemagne, Luxembourg, Pays-Bas, Autriche, Danemark, Italie, Espagne, Portugal, Hongrie, Pologne, Slovaquie, Slovénie, Tchéquie, Suisse, Finlande, Suède, Bulgarie, Estonie, Lettonie, Lituanie, Roumanie, Norvège, Îles Canaries, Irlande, Royaume-Uni (Angleterre, Écosse, Pays de Galles, Irlande du Nord)",
     "法国、比利时、德国、卢森堡、荷兰、奥地利、丹麦、意大利、西班牙、葡萄牙、匈牙利、波兰、斯洛伐克、斯洛文尼亚、捷克、瑞士、芬兰、瑞典、保加利亚、爱沙尼亚、拉脱维亚、立陶宛、罗马尼亚、挪威、加纳利群岛、爱尔兰、英国（英格兰、苏格兰、威尔士、北爱尔兰）")],
  ["mondialrelay", t("Mondial Relay","Mondial Relay"),
   t("France, Belgique, Luxembourg",
     "法国、比利时、卢森堡")],
  ["gpx", t("GPX — Outre-mer","GPX 法国海外属地"),
   t("Saint-Barthélemy, Saint-Martin, Guyane, Guadeloupe, La Réunion, Martinique, Mayotte, Polynésie française",
     "圣巴泰勒米、法属圣马丁、法属圭亚那、瓜德罗普、留尼汪、马提尼克、马约特、法属波利尼西亚")],
  ["fedex", t("FedEx","FedEx"),
   t("Plus de 150 destinations : Amériques, Afrique, Moyen-Orient, Asie-Pacifique et une partie de l'Europe de l'Est. Liste trop longue pour être reproduite ici : appelez le devis avec l'adresse réelle.",
     "逾 150 个目的地：美洲、非洲、中东、亚太及部分东欧。清单过长，此处不再罗列：请以真实地址调用报价接口。")],
  ["laposte", t("La Poste — petit colis","邮政小包路线"),
   t("Chine, États-Unis",
     "中国、美国")],
];

const DECISIONS = [
  [t("Les identifiants numériques de transporteurs","承运商数字 ID"),
   t("Trois jeux d'identifiants incompatibles ont circulé : la table française, la table chinoise et les valeurs réellement retournées par l'API. Cette documentation ne publie plus que les codes. Vérifier en base si des clients en production envoient encore des identifiants numériques avant de les rejeter.",
     "此前流传过三套互不兼容的 ID：法语表、中文表以及 API 实际返回值。本文档只发布 code。在拒绝数字 ID 之前，请先在数据库中确认是否仍有生产客户在使用。")],
  [t("Le bloc account","account 字段块"),
   t("Marqué ici comme hérité et facultatif. Confirmer que le serveur l'accepte bien comme facultatif dès lors que le jeton OAuth2 est présent, puis planifier son retrait.",
     "本文档将其标注为遗留且可选。请确认在携带 OAuth2 令牌时服务端确实接受缺省，随后规划下线。")],
  [t("Le schéma Authorization","Authorization 方案"),
   t("Un jeton porteur transite actuellement sous le schéma Basic. Passer à Bearer, en acceptant les deux le temps de la transition.",
     "当前以 Basic 方案传输 Bearer 令牌。建议改为 Bearer，过渡期内同时兼容两者。")],
  [t("L'idempotence de createShipment","createShipment 幂等性"),
   t("Définir platformOrderNumber comme clé unique : un rejeu doit retourner le bordereau existant, jamais en créer un second.",
     "将 platformOrderNumber 定为唯一键：重复提交应返回已有运单，绝不生成第二笔。")],
  [t("Les codes d'erreur","错误代码"),
   t("Ajouter un champ code stable et indépendant de la langue à côté de message.",
     "在 message 旁增加与语言无关的稳定 code 字段。")],
  [t("Le format de incrementId","incrementId 格式"),
   t("createShipment retourne un entier, orderDetail une chaîne préfixée. Aligner sur un format unique de type chaîne.",
     "createShipment 返回整数，orderDetail 返回带前缀字符串。建议统一为字符串格式。")],
  [t("Le schéma des points relais","驿站数据结构"),
   t("Unifier chronopost et mondialrelay sous une même structure, avec des coordonnées numériques et des horaires normalisés.",
     "将 chronopost 与 mondialrelay 统一为同一结构，坐标使用数值型，营业时间标准化。")],
  [t("La durée de vie de pdfUrl","pdfUrl 有效期"),
   t("Le lien donne accès aux coordonnées du destinataire sans authentification. Définir une expiration et la documenter.",
     "该链接无需认证即可访问收件人信息。请设定有效期并写入文档。")],
  [t("Le filtrage du devis par destination","报价按目的地过滤"),
   t("Cette documentation affirme que le devis ne retourne que les transporteurs desservant la destination. Le confirmer par un test : demander un devis vers un pays non desservi par un transporteur donné (par exemple DPD vers l'Allemagne) et vérifier qu'il est bien absent de la réponse. Si le devis retourne tout le catalogue sans filtrer, la phrase doit être retirée et les tables de destinations redeviennent la seule référence.",
     "本文档声明报价只返回可寄达目的地的承运商。请通过测试确认：向某承运商不覆盖的国家查询报价（例如 DPD 寄往德国），确认其确实未出现在返回中。若报价不做过滤而返回全部承运商，则须删除该表述，目的地对照表将重新成为唯一依据。")],
  [t("La colonne « instructions de facture »","「上传发票说明」列"),
   t("Vide dans les deux versions depuis l'origine. Renseigner, par transporteur, si une facture est exigée et sous quelle forme.",
     "两个版本自始为空。请按承运商填写是否需要发票及其形式要求。")],
];

/* libellés d'interface (reprise du fichier source) */

/* =============================================================================
   LIBELLÉS DE L'INTERFACE / 界面文案
   ========================================================================== */

const UI = {
  param:t("Paramètre","参数"), req:t("Requis","必选"), type:t("Type","类型"),
  desc:t("Description","说明"), field:t("Champ","字段"),
  err:t("Erreur","错误"), cause:t("Déclencheur","触发原因"),
  carriersH:t("Transporteurs","承运商对照表"),
  carrierCode:t("Code à envoyer","应填代码"), carrierName:t("Service","服务"),
  carrierGeo:t("Destinations","可寄达地区"),
  decideH:t("Points à trancher","待确认事项"),
  decideSub:t("Décisions à prendre avant la prochaine version","下一版本发布前需确认"),
  toc:t("Sommaire","目录"),
  ref:t("Référence","参考"),
  see:t("Voir","查看"),
  latest:t("Liste à jour","最新列表"),
  codesOnly:t("Codes seuls","仅代码"),
  open:t("Ouvert","待办"),
  carriersNote:t("Cette table est une référence de lecture, pas une source de vérité. Pour savoir qui dessert une adresse donnée, appelez le devis avec les deux adresses réelles : sa réponse tient compte du pays, du code postal, du poids et des dimensions, et reflète l'état actuel du réseau.","本表仅供查阅，不是权威来源。要确认谁能送达某个地址，请以真实的收寄地址调用报价接口：其返回已综合国家、邮编、重量与尺寸，并反映网络的当前状态。"),
  carriersLede:t("Reportez la valeur de la colonne code dans createShipment/carrier. Les identifiants numériques ne sont plus publiés : ils divergeaient entre les versions de cette documentation et des valeurs réellement retournées par l'API. Les destinations listées ici décrivent le périmètre d'un service ; elles ne remplacent pas un devis, qui seul tient compte du poids, des dimensions et de l'état du réseau au moment de l'envoi.","请将 code 列的值填入 createShipment/carrier。数字 ID 不再发布：其在本文档不同版本之间以及与 API 实际返回值之间存在冲突。此处所列目的地用于说明各服务的覆盖范围，不能替代报价 —— 只有报价才会综合重量、尺寸与寄件时的网络状态。"),
  tagLegacy:t("hérité","遗留"), tagAdded:t("ajouté","新增"), tagFixed:t("corrigé","已修正"),
  footL:t("Documentation générée depuis une source unique bilingue.","本文档由唯一双语数据源生成。"),
  /* nouveaux libellés */
  search:t("Filtrer les paramètres…","筛选参数…"),
  searchNone:t("Aucun paramètre ne correspond.","没有匹配的参数。"),
  copy:t("Copier","复制"), copied:t("Copié","已复制"),
  anchor:t("Copier le lien vers cette section","复制本节链接"),
  quickH:t("Démarrage rapide","快速开始"),
  quickSub:t("Premier appel réussi en une quinzaine de minutes.","约十五分钟完成第一次成功调用。"),
  quickStep:t("Étape","步骤"),
};

/* =============================================================================
   DÉMARRAGE RAPIDE / 快速开始
   Quatre étapes, du compte au premier bordereau.
   ========================================================================== */

const QUICKSTART = [
  {
    h: t("Créer vos identifiants OAuth2","创建 OAuth2 凭据"),
    d: t("Depuis votre espace client 37 Express, rubrique Mon compte puis Mes identifiants API, créez une paire d'identifiants et donnez-lui le nom de l'outil que vous connectez. La clé secrète n'est affichée qu'une seule fois, à la création : copiez-la immédiatement, elle n'est plus consultable ensuite, ni par vous ni par le support. Conservez-la côté serveur uniquement — elle ne doit jamais apparaître dans un client public, une application mobile ou du JavaScript de navigateur.",
         "登录 37 Express 客户后台，进入「我的账户」-「我的 API 凭据」，创建一对凭据并以所连接的工具命名。密钥仅在创建时显示一次：请立即复制，此后无法再次查看，您和客服均无法找回。请仅在服务端保存 —— 切勿出现在公开客户端、移动应用或浏览器 JavaScript 中。"),
  },
  {
    h: t("Obtenir un jeton d'accès","获取访问令牌"),
    d: t("Le jeton est valable une heure. Le refresh_token retourné permet de le renouveler pendant trente jours sans redemander les identifiants.",
         "令牌有效期 1 小时。返回的 refresh_token 可在 30 天内续期，无需重新提交凭据。"),
    code:
`AUTH=$(echo -n "VOTRE_CLIENT_ID:VOTRE_CLIENT_SECRET" | base64)

curl -X POST https://www.37-express.com/qyfr/oauth2/token \
  -H "Authorization: Basic $AUTH" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials"`,
  },
  {
    h: t("Demander un devis","查询报价"),
    d: t("Reportez la valeur access_token de l'étape précédente. Vous obtenez la liste des transporteurs éligibles avec leur tarif et leur code.",
         "填入上一步返回的 access_token。将返回可用承运商及其价格与代码。"),
    code:
`curl -X POST https://www.37-express.com/qyfr/api/parcel/v2/ \
  -H "Authorization: Basic VOTRE_ACCESS_TOKEN" \
  -H "X-37-EXPRESS-API-OA2: 1.0" \
  -H "Content-Type: application/json" \
  -d '{
    "carriers": {
      "parcels": [{"weight": 2, "length": 30, "width": 20, "height": 10}],
      "senderAddress": {
        "companyName": "MA SOCIETE", "countryCode": "FR",
        "city": "AUBERVILLIERS", "street": "8 RUE DE LA HAIE COQ",
        "postalCode": "93300", "phoneNumber": "0148342502"
      },
      "receiverAddress": {
        "companyName": "CLIENT TEST", "countryCode": "BE",
        "city": "BRUXELLES", "street": "1 RUE NEUVE",
        "postalCode": "1000", "phoneNumber": "003222180000"
      }
    }
  }'`,
  },
  {
    h: t("Créer le bordereau et récupérer l'étiquette","创建运单并获取面单"),
    d: t("Reprenez le champ code du transporteur choisi. La réponse contient le numéro de bordereau, les numéros de suivi et le lien d'impression de l'étiquette. Cet appel est facturé.",
         "填入所选承运商的 code。返回内容包含运单编号、跟踪单号与面单打印链接。本次调用会产生费用。"),
    code:
`curl -X POST https://www.37-express.com/qyfr/api/parcel/v2/ \
  -H "Authorization: Basic VOTRE_ACCESS_TOKEN" \
  -H "X-37-EXPRESS-API-OA2: 1.0" \
  -H "Content-Type: application/json" \
  -d '{
    "createShipment": {
      "carrier": "gls",
      "platformOrderNumber": "TEST-0001",
      "createTrackingNumber": true,
      "getPdfFile": false,
      "parcels": [{"weight": 2, "length": 30, "width": 20, "height": 10}],
      "senderAddress": {
        "companyName": "MA SOCIETE", "countryCode": "FR",
        "city": "AUBERVILLIERS", "street": "8 RUE DE LA HAIE COQ",
        "postalCode": "93300", "phoneNumber": "0148342502"
      },
      "receiverAddress": {
        "companyName": "CLIENT TEST", "countryCode": "BE",
        "city": "BRUXELLES", "street": "1 RUE NEUVE",
        "postalCode": "1000", "phoneNumber": "003222180000"
      }
    }
  }'`,
  },
];

window.API37 = { B, DOC, CARRIERS, DECISIONS, UI, QUICKSTART };
