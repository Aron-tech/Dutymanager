const { SlashCommandBuilder } = require('discord.js');

const commands = [
    new SlashCommandBuilder()
    .setName('help')
    .setDescription('Parancsok kilistázása.'),
    new SlashCommandBuilder()
        .setName('duty')
        .setDescription('Szolgálatba/ból belépés/kilépés.'),
        new SlashCommandBuilder()
        .setName('adat')
        .setDescription('Szolgálati idő lekérése.'),
    new SlashCommandBuilder()
        .setName('megse')
        .setDescription('Kilépés a szolgálatból mentés nélkül.'),
    new SlashCommandBuilder()
        .setName('dicseret')
        .setDescription('Szolgálati idő lekérése egy felhasználónak.')
        .addUserOption(option =>
          option.setName('user')
              .setDescription('A felhasználó Discord tagje')
              .setRequired(true))
        .addStringOption(option =>
          option.setName('reason')
              .setDescription('Az indok amiért dícséretet adsz az illetőnek.')
              .setRequired(true)),
    new SlashCommandBuilder()
        .setName('szabadsag')
        .setDescription('Szabadságra menés. Fontos: Csak akkor használd ha már szabadságra akarsz menni!')
        .addIntegerOption(option =>
          option.setName('date')
              .setDescription('Add meg hány napig nem leszel.')
              .setRequired(true))
        .addStringOption(option =>
          option.setName('reason')
              .setDescription('Az indok amiért szabadságra mész.')
              .setRequired(true)),
    new SlashCommandBuilder()
              .setName('munka')
              .setDescription('Szabadságról visszajövetel.'),
    new SlashCommandBuilder()
        .setName('getduty')
        .setDescription('Szolgálati idő lekérése egy felhasználónak.')
        .addUserOption(option => 
            option.setName('user')
                .setDescription('A felhasználó, akinek az adatit le szeretnéd kérni.')
                .setRequired(true)
        ),
    new SlashCommandBuilder()
        .setName('getinfo')
        .setDescription('Információk lekérése a felhasználóról')
        .addUserOption(option =>
          option.setName('user')
              .setDescription('A felhasználó Discord tagje')
              .setRequired(false))
        .addStringOption(option =>
          option.setName('discord_id')
              .setDescription('A felhasználó Discord ID-je.')
              .setRequired(false))
        .addStringOption(option =>
                option.setName('icnev')
                    .setDescription('A felhasználó IC neve.')
                    .setRequired(false))
        .addStringOption(option =>
                      option.setName('kodnev')
                          .setDescription('A felhasználó Kódneve.')
                          .setRequired(false))
        .addStringOption(option =>
                            option.setName('steam')
                                .setDescription('A felhasználó Steam neve.')
                                .setRequired(false))
        .addIntegerOption(option =>
                            option.setName('badgenum')
                                .setDescription('A felhasználó Jelvényszáma.')
                                .setRequired(false)),
         new SlashCommandBuilder()
                                .setName('edituser')
                                .setDescription('Információk módosítása felhasználónak')
                                .addUserOption(option =>
                                  option.setName('user')
                                      .setDescription('A felhasználó Discord tagje')
                                      .setRequired(true))
                                .addStringOption(option =>
                                        option.setName('icnev')
                                            .setDescription('A felhasználó IC neve.')
                                            .setRequired(false))
                                .addStringOption(option =>
                                              option.setName('kodnev')
                                                  .setDescription('A felhasználó Kódneve.')
                                                  .setRequired(false))
                                .addStringOption(option =>
                                                    option.setName('phonenum')
                                                        .setDescription('A felhasználó Telefonszáma neve.')
                                                        .setRequired(false))
                                .addStringOption(option =>
                                                    option.setName('steam')
                                                        .setDescription('A felhasználó Steam neve.')
                                                        .setRequired(false))
                                .addIntegerOption(option =>
                                                    option.setName('badgenum')
                                                        .setDescription('A felhasználó Jelvényszáma.')
                                                        .setRequired(false)),
        new SlashCommandBuilder()
          .setName('kileptet')
          .setDescription('Szolgálatból való kiléptetés leader által.')
          .addUserOption(option =>
             option.setName('user').setDescription('A felhasználó, akit ki szeretnél léptetni szolgálatból.').setRequired(true)),
             
        new SlashCommandBuilder()
          .setName('figyelmeztetes')
          .setDescription('Figyelmeztetés kiosztása.')
          .addUserOption(option =>
             option.setName('user').setDescription('A felhasználó, akire figyelmeztetést akarsz adni.').setRequired(true))
          .addStringOption(option =>
              option.setName('reason').setDescription('Indok, hogy miért kapja a figyelmeztetést.').setRequired(true)),
        new SlashCommandBuilder()
              .setName('figylevetel')
              .setDescription('Figyelmeztetés levétele.')
              .addUserOption(option =>
                 option.setName('user').setDescription('A felhasználó, akiről figyelmeztetést le akarod venni.').setRequired(true))
              .addStringOption(option =>
                  option.setName('reason').setDescription('Indok, hogy miért veszed le a figyelmeztetést.').setRequired(true)),
              new SlashCommandBuilder()
        .setName('torol')
        .setDescription('Szolgálati idő törlése egy felhasználónak.')
        .addUserOption(option => 
            option.setName('user')
                .setDescription('A felhasználó, akinek az adatit törölni szeretnéd.')
                .setRequired(true)
        ),
    new SlashCommandBuilder()
        .setName('hozzaad')
        .setDescription('Szolgálati idő hozzáadása egy felhasználóhoz.')
        .addUserOption(option => option.setName('user').setDescription('A felhasználó, akinek a szolgálati idejét hozzá szeretnéd adni.').setRequired(true))
        .addIntegerOption(option => option.setName('minutes').setDescription('A hozzáadandó perc száma a szolgálati időhöz.').setRequired(true)),
    new SlashCommandBuilder()
        .setName('visszavon')
        .setDescription('Szolgálati idő elvétele egy felhasználótól.')
        .addUserOption(option => option.setName('user').setDescription('A felhasználó, akinek a szolgálati idejéből le szeretnél venni.').setRequired(true))
        .addIntegerOption(option => option.setName('minutes').setDescription('A elvetelendő perc száma a szolgálati időből.').setRequired(true)),
    new SlashCommandBuilder()
        .setName('osszes')
        .setDescription('Összes szolgálati idő lekérése az adott időszakban.'),
    new SlashCommandBuilder()
        .setName('osszesfrakcio')
        .setDescription('Összes szolgálati idő lekérése a frakcióba csatlakozástól fogva.'),
    new SlashCommandBuilder()
          .setName('reset')
          .setDescription('Összes szolgálati idő törlése.'),
    new SlashCommandBuilder()
          .setName('ellenorzes')
          .setDescription('Szolgálati idől ellenőrzése.'),
    new SlashCommandBuilder()
          .setName('felvesz')
          .setDescription('Felvesz az állományba egy felhasználót.')
          .addUserOption(option =>
            option.setName('user')
                .setDescription('A felhasználó Discord tagje')
                .setRequired(true))
          .addStringOption(option =>
                  option.setName('icnev')
                      .setDescription('A felhasználó IC neve.')
                      .setRequired(true))
          .addStringOption(option =>
                        option.setName('kodnev')
                            .setDescription('A felhasználó Kódneve.')
                            .setRequired(true))
          .addStringOption(option =>
                              option.setName('steam')
                                  .setDescription('A felhasználó Steam neve.')
                                  .setRequired(true))
          .addStringOption(option =>
                                    option.setName('phonenum')
                                        .setDescription('A felhasználó telefonszáma.')
                                        .setRequired(true))
          .addIntegerOption(option =>
                              option.setName('badgenum')
                                  .setDescription('A felhasználó Jelvényszáma.')
                                  .setRequired(true)),
    new SlashCommandBuilder()
             .setName('szobeli')
             .setDescription('Szóbeli és S.A.H.P. rang rátétele.')
             .addUserOption(option =>
                option.setName('user').setDescription('A felhasználó, aki át ment a szóbelin.').setRequired(true)),
    new SlashCommandBuilder()
          .setName('rangup')
          .setDescription('Feljebb léptet egy felhasználót a ranglistán.')
          .addUserOption(option =>
             option.setName('user').setDescription('A felhasználó, akit feljebb szeretnél léptetni.').setRequired(true)),
    new SlashCommandBuilder()
          .setName('lefokoz')
          .setDescription('Lefokoz egy felhasználót a ranglistán.')
          .addUserOption(option =>
             option.setName('user').setDescription('A felhasználó, akit le szeretnél fokozni.').setRequired(true)),
    new SlashCommandBuilder()
    .setName('kirug')
    .setDescription('Állományból való kirúgás.')
    .addUserOption(option =>
      option.setName('user').setDescription('A felhasználó akit kiakarsz rúgni az állományból.').setRequired(true)).addStringOption(option =>
        option.setName('indok')
            .setDescription('Az indok amiért az illető ki lett rúgva a frakiból.')
            .setRequired(true)),
    new SlashCommandBuilder()
            .setName('addfeketelista')
            .setDescription('Feketelistához hozzáadás.')
            .addUserOption(option =>
              option.setName('user').setDescription('A felhasználó akit feketelistára akarsz tenni.').setRequired(true)).addStringOption(option =>
                option.setName('indok')
                    .setDescription('Az indok amiért feketelistára kerül.')
                    .setRequired(true))
                    .addIntegerOption(option =>
                        option
                          .setName('opcio')
                          .setDescription('Válassz feketelista lehetőséget')
                          .setRequired(true)
                          .addChoices(
                            { name: 'Leader által', value: 0 },
                            { name: 'Admin által', value: 1 }
                          )
                      ),
    new SlashCommandBuilder()
            .setName('userdelete')
            .setDescription('Adatbázisból az információk eltávolítása.')
            .addStringOption(option =>
                option.setName('discord_id')
                    .setDescription('A felhasználó Discord ID-je.')
                    .setRequired(true)),
    new SlashCommandBuilder()
             .setName('telepit')
             .setDescription('Beküldi a megfelelő csatornákba a duty és a szabadság panelt.'),
    new SlashCommandBuilder()
              .setName('konfiguralas')
              .setDescription('Új szerver bekonfigurálása.')
              .addStringOption(option =>
                option
                  .setName('opcio')
                  .setDescription('Válassz egy lehetőséget')
                  .setRequired(true)
                  .addChoices(
                    { name: 'Újratelepítés', value: 'ujratelepites' },
                    { name: 'Telepítés', value: 'telepites' }
                  )
              ),
    new SlashCommandBuilder()
             .setName('check')
             .setDescription('Figyelmeztetések és szabadság ellenőrzése.')
 ];

 module.exports = commands;