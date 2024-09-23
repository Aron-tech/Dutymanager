const {Client,ActionRowBuilder, EmbedBuilder,PermissionsBitField, ButtonBuilder, ButtonStyle, IntentsBitField, UserFlagsBitField } = require('discord.js');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const commands = require('./commandRegister.js');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
require('dotenv').config();
const token = process.env.TOKEN;
const { channel } = require('diagnostics_channel');
const client = new Client({
  intents: [
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMembers,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.MessageContent,
    IntentsBitField.Flags.GuildVoiceStates,
    IntentsBitField.Flags.DirectMessages
  ],});
// 6 db log szoba, 
const clientId='YOUR_CLIENT';
let db;

async function syncCommands(guildID) {
  const rest = new REST({ version: '10' }).setToken(token);

  try {
    await rest.put(
      Routes.applicationGuildCommands(clientId, guildID),
      { body: commands },
    );

    console.log(`Parancsok szinkronizálása sikeres volt itt: ${guildID}`);
  } catch (error) {
    console.error(error);
    console.log(`Parancsok szinkronizálása sikertelen volt itt: ${guildID}`);
  }2
}

client.once('ready', async () => {
  try {
    const database = await open({
      filename: './database.db',
      driver: sqlite3.Database,
    });
    db = database;
    await db.exec('CREATE TABLE IF NOT EXISTS duty_logs (server_id TEXT, user_id TEXT, time_on_duty INTEGER)');
    await db.exec('CREATE TABLE IF NOT EXISTS dicseretek (server_id TEXT, user_id TEXT, reason TEXT, from_id TEXT)');
    //await db.exec('CREATE TABLE IF NOT EXISTS szolgalatba (server_id TEXT PRIMARY KEY, user_id TEXT, intime TEXT, messageid TEXT)');
    await db.exec('CREATE TABLE IF NOT EXISTS servers (' +
      'server_id TEXT PRIMARY KEY, ' +
      'felki_log TEXT, szolgalatban_room TEXT, roles_log TEXT, ' +
      'duty_log TEXT, now_log TEXT, warn_log TEXT, warnroom_id TEXT, ' +
      'dutyonoff_log TEXT, reg_id TEXT, default_id TEXT, roles_ids TEXT, ' +
      'szolgalatban_id TEXT, felhivasroom_id TEXT, szabadroom_id TEXT, ' +
      'leader_id TEXT, vezetosegi_id TEXT, ' +
      'szabadsag_id TEXT, szobeli_id TEXT, varakozas_id TEXT, warns_ids TEXT, ranguptime INTEGER, warntime INTEGER, ellenorzes_days INTEGER)');
    await db.exec('CREATE TABLE IF NOT EXISTS duty (server_id TEXT, user_id TEXT, time_on_duty INTEGER)');
    await db.exec('CREATE TABLE IF NOT EXISTS osszes_duty (server_id TEXT, user_id TEXT, time_on_duty INTEGER)');
    await db.exec('CREATE TABLE IF NOT EXISTS rangon (server_id TEXT, user_id TEXT, date DATE)');
    await db.exec('CREATE TABLE IF NOT EXISTS users (server_id TEXT, user_id TEXT, icName TEXT, codeName TEXT, badgenum TEXT, phoneNum TEXT, steamName TEXT)');
    await db.exec('CREATE TABLE IF NOT EXISTS warnings (server_id TEXT, user_id TEXT, reason TEXT, timestamp INTEGER, roleid TEXT)');
    await db.exec('CREATE TABLE IF NOT EXISTS szabadsag (server_id TEXT, user_id TEXT, reason TEXT, timestamp INTEGER)');
    await db.exec('CREATE TABLE IF NOT EXISTS feketelista (server_id TEXT, user_id TEXT, reason TEXT, vegleges TINYINT)');
    
    await runChecks();
    console.log('A bot sikeresen elindult!');
  } catch (error) {
    console.error('Hiba történt az adatbázis inicializálása során:', error);
  }
});
client.on('guildCreate', async guild => {
  console.log(`Új szerverre csatlakozott: ${guild.name}`);

  const rest = new REST({ version: '10' }).setToken(token);

  try {
    console.log(`Started refreshing application (/) commands for guild ${guild.id}.`);

    await rest.put(Routes.applicationGuildCommands(clientId, guild.id), { body: commands });

    console.log(`Successfully reloaded application (/) commands for guild ${guild.id}.`);
  } catch (error) {
    console.error(error);
  }
});
async function getServerConfig(this_server){
  const rows= await db.get('SELECT * FROM servers WHERE server_id = ?', this_server);
if(rows) {
  return rows;
}else {
  return;
}
}
async function getGuild(guildID){
  const guild5 = client.guilds.cache.get(guildID);
  if (!guild5) {
      return console.error(`Nem található a szerver ezzel az ID-vel: ${guildID}`);
  } else {
    return guild5;
  }
}
async function deleteUserData(serverid, taggedUserID) {
      await db.get('DELETE FROM duty_logs WHERE server_id = ? AND user_id = ?', [serverid, taggedUserID]);
      await db.get('DELETE FROM duty WHERE server_id = ? AND user_id = ?', [serverid, taggedUserID]);
      await db.get('DELETE FROM rangon WHERE server_id = ? AND user_id = ?', [serverid, taggedUserID]);
      await db.get('DELETE FROM dicseretek WHERE server_id = ? AND user_id = ?', [serverid, taggedUserID]);
      await db.get('DELETE FROM users WHERE server_id = ? AND user_id = ?', [serverid, taggedUserID]);
      await db.get('DELETE FROM osszes_duty WHERE server_id = ? AND user_id = ?', [serverid, taggedUserID]);
      await db.get('DELETE FROM warnings WHERE server_id = ? AND user_id = ?', [serverid, taggedUserID]);
      await db.get('DELETE FROM szabadsag WHERE server_id = ? AND user_id = ?', [serverid, taggedUserID]);
}
async function checkBotRank(guild) {
  try {
    // Kérd le a bot tagot a guild-ből
    const botMember = guild.members.cache.get(guild.client.user.id);

    if (!botMember) {
      console.error('Nem található a bot a guild tagok között.');
      return false;
    }

    // Kérd le a bot rangját
    const botRole = botMember.roles.highest;

    // Kérd le az összes rangot a guild-ből
    const roles = guild.roles.cache;

    // Ellenőrizd, hogy a bot rangja minden más rang felett van
    let isBotAboveAll = true;

    roles.forEach(role => {
      // Ellenőrizzük, hogy a rang nem a bot rangja és nem az @everyone rang
      if (role.id !== botRole.id && role.id !== guild.id) {
        if (role.position >= botRole.position) {
          isBotAboveAll = false;
        }
      }
    });

    return isBotAboveAll;
  } catch (error) {
    console.error('Hiba a bot rangjának ellenőrzése közben:', error);
    return false;
  }
}
async function runChecks() {
  try {
    const rows = await db.all('SELECT * FROM servers');
    if (!rows) {
      return;
    }
    for (const row of rows) {
      //console.log("ID:"+row.server_id;
      const guildId=row.server_id;
      const checkGuild = await getGuild(guildId);
      await checkszab(checkGuild);
      await checkwarn(checkGuild);
      await syncCommands(guildId);
      await synSzolgalat();
      /*const channel = await client.channels.fetch(row.now_log);
    channel.send('Teszt');*/
    }
  } catch (err) {
    console.error('Error accessing the database:', err);
  }
}

async function updateDutyMessage(guildId) {
  try {
    const guildData = await db.get('SELECT * FROM servers WHERE server_id = ?', [guildId]);
    if (!guildData) {
      console.error(`No data found for guild ID: ${guildId}`);
      return;
    }

    const channel = await client.channels.fetch(guildData.now_log);
    console.log(`Channel fetched: ${channel.id}`);
    let dutyMessageId = guildData.messageid;
    let message;

    try {
      // Próbáljuk meg lekérni az üzenetet, ha van megadott messageid
      if (dutyMessageId) {
        message = await channel.messages.fetch(dutyMessageId);
        //console.log(`Message fetched: ${message.id}`);
      } else {
        // Ha nincs megadott messageid, küldjünk új üzenetet
        console.log('No messageid found, sending a new message');
        message = await channel.send('# Jelenleg szolgálatban:\n');
        dutyMessageId = message.id;
        await db.run('UPDATE servers SET messageid = ? WHERE server_id = ?', [dutyMessageId, guildId]);
        //console.log(`New message sent: ${message.id}`);
      }
    } catch (error) {
      // Ha az üzenet lekérési kísérlet sikertelen, küldjünk új üzenetet
      console.log(`Failed to fetch message, sending a new one: ${error.message}`);
      message = await channel.send('# Jelenleg szolgálatban:\n');
      dutyMessageId = message.id;
      await db.run('UPDATE servers SET messageid = ? WHERE server_id = ?', [dutyMessageId, guildId]);
      //console.log(`New message sent: ${message.id}`);
    }

    // Ellenőrizzük, hogy a message egy érvényes üzenet objektum
    if (!message || typeof message.edit !== 'function') {
      console.error('Invalid message object:', message);
      throw new Error('Invalid message object');
    }

    let content = '# Jelenleg szolgálatban:\n\n';
    const dutyStatus = await db.all('SELECT user_id, time_on_duty FROM duty_logs WHERE server_id = ?', [guildId]);
    //console.log(`Duty status retrieved: ${dutyStatus.length} entries`);

    for (const { user_id, time_on_duty } of dutyStatus) {
      const names = await db.get('SELECT icName, steamName FROM users WHERE user_id = ? AND server_id = ?', [user_id, guildId]);
      const member = await channel.guild.members.fetch(user_id);
      if (!names) {
        const staffNotificationChannel = channel.guild.channels.cache.get(guildData.felki_log);
        await staffNotificationChannel.send(`**Nincs felvéve megfelelően <@${user_id}>!**`);
        continue;
      }
      content += `**Discord:** *${member}* - **IC név:** *${names.icName}* - **Steam név:** *${names.steamName}* --> **Szolgálatba lépett:** *${formatDate2(new Date(time_on_duty))}*\n`;
    }

    await message.edit(content || '# Nincs jelenleg senki szolgálatban.');
    //console.log('Message updated successfully');
  } catch (err) {
    //console.error(`Error updating duty message for guild ID: ${guildId}`, err);
  }
}

// Helper function to get the date when a user got the current role
async function getRoleDate(serverid, userId) {
  const rows = await db.all('SELECT date FROM rangon WHERE server_id = ? AND user_id = ? ORDER BY date DESC LIMIT 1', [serverid, userId]);
  return rows[0]?.date || null;
}
async function checkwarn(guild6) {
  console.log(guild6.id);
  const info = await db.get('SELECT ellenorzes_days FROM servers WHERE server_id = ?', guild6.id);
  if(!info){
    return console.log('Nem szerepel az adatbázisban megfelelően!');
  }else {
    const timestamp = Math.floor(Date.now() / 1000) - ((info.ellenorzes_days + 1) * 24 * 60 * 60); // 8 nap
    console.log(timestamp);
  try {
    // Lekérjük az összes lejárt figyelmeztetést az adatbázisból
    const rows = await db.all('SELECT user_id,roleid FROM warnings WHERE server_id = ? AND timestamp < ?', guild6.id, timestamp);
    // Az összes lejárt figyelmeztetést töröljük az adatbázisból
    await db.run('DELETE FROM warnings WHERE server_id = ? AND timestamp <= ?', guild6.id, timestamp);

    // Az összes lejárt figyelmeztetéshez társított felhasználók rangjait eltávolítjuk
    for (const row of rows) {
      let user = null;
      let roleToRemove = null;
      try {
        user = await guild6.members.fetch(row.user_id).catch(() => null);
        roleToRemove = await guild6.roles.cache.get(row.roleid);

        if (!user) {
          //console.log(`Felhasználó nem található: user_id = ${row.user_id}`);
        } else if (!roleToRemove) {
          //console.log(`Szerep nem található: role_id = ${row.roleid}`);
        } else {
          //console.log(`Felhasználó: ${user.id}, Rang: ${roleToRemove.name}`);

          // Ellenőrizzük, hogy a felhasználó rendelkezik-e 'user' tulajdonsággal
          if (user.user) {
            //console.log(`Rang eltávolítva: ${roleToRemove.name} - Felhasználó: ${user.user.tag}`);
          } else {
            //console.log(`A felhasználó nem rendelkezik 'user' tulajdonsággal.`);
          }
          
          await user.roles.remove(roleToRemove);
        }
      } catch (fetchError) {
        console.error(`Hiba történt a felhasználó vagy szerep lekérdezése közben (user_id: ${row.user_id}, role_id: ${row.roleid}):`, fetchError);
      }
    }
    console.log('Lejárt figyelmeztetések és rangok sikeresen eltávolítva.');
  } catch (err) {
    console.error('Hiba történt a lejárt figyelmeztetések és rangok eltávolítása közben:', err.message);
  }
}
}
async function checkszab(guild6){
  const timestamp = Math.floor(Date.now() / 1000);
  try {
    // Lekérjük az összes lejárt szabadságot az adatbázisból
    const rows = await db.all('SELECT user_id FROM szabadsag WHERE server_id = ? AND timestamp < ?', guild6.id, timestamp);
    const szabad = await db.get('SELECT szabadsag_id FROM servers WHERE server_id = ?', guild6.id);
    // Ellenőrizzük, hogy a szabadság szerep létezik-e
    if (!szabad || !szabad.szabadsag_id) {
      console.error('A szabadság szerep nem található.');
      return;
    }

    const szabadsag = guild6.roles.cache.get(szabad.szabadsag_id);
    if (!szabadsag) {
      console.error('A szabadság szerep nem található a szerver gyorsítótárában.');
      return;
    }

    // Az összes lejárt szabadságot töröljük az adatbázisból
    await db.run('DELETE FROM szabadsag WHERE server_id = ? AND timestamp < ?', guild6.id, timestamp);
    
    // Az összes lejárt figyelmeztetéshez társított felhasználók rangjait eltávolítjuk
    for (const row of rows) {
      let user = null;
      try {
        user = await guild6.members.fetch(row.user_id).catch(() => null);
        if (!user) {
          //console.log(`Felhasználó nem található: user_id = ${row.user_id}`);
        }  else {
          // Ellenőrizzük, hogy a felhasználó rendelkezik-e 'user' tulajdonsággal
          if (user.user) {
            console.log(`Szabadság rang eltávolítva - Felhasználó: ${user.user.tag}`);
          } else {
            //console.log(`A felhasználó nem rendelkezik 'user' tulajdonsággal.`);
          }
          await user.roles.remove(szabadsag);
          user.send('Lejárt a szabadságod! Figyelj rá!');
        }
      } catch (fetchError) {
        console.error(`Hiba történt a felhasználó vagy szerep lekérdezése közben (user_id: ${row.user_id}):`, fetchError);
      }
    }
    console.log('Lejárt szabadságok és rangok sikeresen eltávolítva.');
  } catch (err) {
    console.error('Hiba történt a lejárt szabadságok és rangok eltávolítása közben:', err.message);
  }
}

async function formatDate(timestamp) {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const formattedDate = `${year}-${month}-${day}`;
  return formattedDate;
}
function formatDate2(datet) {
  // Hozzáadunk 2 órát az időhöz
  const date = new Date(datet)
  date.setHours(date.getHours() + 2);

  // Formátum: Év.Hónap.Nap. Óra:Perc:Másodperc
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return `${year}.${month}.${day}. ${hours}:${minutes}:${seconds}`;
}
async function getFactionDate(serverid, userId) {
  const rows = await db.all('SELECT date FROM rangon WHERE server_id = ? AND user_id = ? ORDER BY date ASC LIMIT 1', [serverid, userId]);
  return rows[0]?.date || null;
}
// Helper function to calculate the number of days since a given date
function calculateDaysOnRole(roleDate) {
  if (!roleDate) {
    return 'N/A'; // No role date available
  }

  const currentDate = new Date();
  const daysOnRole = Math.floor((currentDate - new Date(roleDate)) / (1000 * 60 * 60 * 24));

  return daysOnRole;
}
async function szolgalatbanRoom(serverid,server) {
  try {
    const myguild = await client.guilds.fetch(serverid);
    await myguild.members.fetch();
    const membersWithServiceRole = myguild.members.cache.filter(member => member.roles.cache.has(server.szolgalatban_id));
    const serviceRoleCount = membersWithServiceRole.size;
    const channelId2 = server.szolgalatban_room;
    const serviceChannel2 = await client.channels.fetch(channelId2);
    if (!serviceChannel2) {
      console.error(`Channel with ID ${channelId2} not found.`);
      return;
    }
    await serviceChannel2.setName(`Szolgálatban: ${serviceRoleCount}`);
  } catch (error) {
    console.error(`Error in szolgalatbanRoom: ${error}`);
  }
}
async function getTotalDutyTime(serverid, userId) {
  const rows = await db.all('SELECT SUM(time_on_duty) AS total_time FROM duty WHERE server_id = ? AND user_id = ?', [serverid, userId]);
  return rows[0]?.total_time || 0;
}
async function getDicseretNum(serverid, userId){
  const rows = await db.all('SELECT COUNT(user_id) as count FROM dicseretek WHERE server_id = ? AND user_id = ?', [serverid, userId]);
  return rows[0]?.count || 0;
}
async function getTotalDutyTimeFaction(serverid, userId) {
  const rows = await db.all('SELECT SUM(time_on_duty) AS total_time FROM osszes_duty WHERE server_id = ? AND user_id = ?', [serverid, userId]);
  return rows[0]?.total_time || 0;
}
function convert(minutes) {
  if (isNaN(minutes) || minutes < 0) {
    return 'Érvénytelen bemenet';
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return `${hours} óra ${remainingMinutes} perc`;
}

client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand() && !interaction.isButton()) return;
    
    if(interaction.isCommand()){
    const { commandName, options } = interaction;
    const serverid = interaction.guild.id;
    const rolesBot=await checkBotRank(interaction.guild);
    const this_server_id = await db.get('SELECT server_id FROM servers WHERE server_id = ?', [serverid]);
    if(!rolesBot){
      return interaction.reply({content:`A bot rangja legyen a legmagasabb a szerveren!`,ephemeral: true});
    }
    
    /*if (commandName === 'konfiguralas') {
      if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return interaction.reply({content:`A parancs használatához adminisztrátori jogosultság szükséges!`,ephemeral: true});
      }
      const choice = options.getString('opcio');
      if (this_server_id && choice ==='telepites') {
        return interaction.reply({content:`A szerver már regisztrálva van az adatbázisban! Használd az újratelepítés funkciót!`,ephemeral: true});
      } else if(this_server_id && choice==='ujratelepites'){
        await db.get('DELETE FROM servers WHERE server_id = ?', [serverid]);
      }
      
      await interaction.deferReply(); // Defer válasz az interakcióra
    
      const channelNames = [
        'felvetel-kirugas-log',
        'eloleptetes-lefokozas-log',
        'duty-log',
        'aktuális-szolgálatba-lévők',
        'figyelmeztetés-log',
        'szolgálat-beki-log',
      ];
    
      let category;
    
      try {
        // Kategória létrehozása
        category = await interaction.guild.channels.create({
          name: 'Rendvédelem Bot Logs',
          type: 4, // GUILD_CATEGORY
          reason: 'Kategória létrehozása rendszergazdák számára'
        });
    
        await category.permissionOverwrites.create(interaction.guild.id, {
          VIEW_CHANNEL: PermissionsBitField.Flags.ViewChannel
        });
    
      } catch (error) {
        console.error(`Hiba a kategória létrehozása közben: ${error}`);
        return interaction.followUp('Hiba történt a kategória létrehozása közben.');
      }
    
      const channelIDs = [];
    
      try {
        // Csatornák létrehozása a kategóriában
        for (const name of channelNames) {
          const channel = await interaction.guild.channels.create({
            name: name,
            type: 0, // GUILD_TEXT
            parent: category.id, // Kategória ID-ja
            reason: 'Új csatorna létrehozása'
          });
          channelIDs.push(channel.id);
        }
        const channel = await interaction.guild.channels.create({
          name: "Szolgálatban:",
          type: 2, // 2 az értéke a GUILD_VOICE (hangcsatorna) típusnak
          reason: 'Szolgálatban'
        });
        channelIDs.push(channel.id);
      } catch (error) {
        console.error(`Hiba a csatornák létrehozása közben: ${error}`);
        return interaction.followUp('Hiba történt a csatornák létrehozása közben.');
      }
    
      // IC rangok száma bekérése
      try {
        await interaction.followUp('Kérlek, add meg hány IC rang van:');
        const filter = response => response.author.id === interaction.user.id;
        const collected = await interaction.channel.awaitMessages({ filter, max: 1, time: 60000, errors: ['time'] });
        const icRankCount = parseInt(collected.first().content);
    
        if (isNaN(icRankCount) || icRankCount <= 0) {
          return await interaction.followUp('Érvénytelen IC rang szám.');
        }
    
        let roleIds = [];
        for (let i = 0; i < icRankCount; i++) {
          await interaction.followUp(`Kérlek, add meg a(z) ${i + 1}. IC rangot említéssel:`);
          const collectedRole = await interaction.channel.awaitMessages({ filter, max: 1, time: 60000, errors: ['time'] });
          const roleMention = collectedRole.first().content;
    
          if (roleMention.startsWith('<@&') && roleMention.endsWith('>')) {
            const roleId = roleMention.slice(3, -1); // Kivonjuk az ID-t az említésből
            roleIds.push(roleId);
          } else {
            return await interaction.followUp('Érvénytelen rang említés. Kérlek, próbáld újra.');
          }
        }
    
        const roleIdsString = roleIds.join(',');

        const warnRoleIds = [];
        for (let i = 0; i < 3; i++) {
          await interaction.followUp(`Kérlek, add meg a(z) ${i + 1}. figyelmeztetés rangot említéssel:`);
          const collectedRole = await interaction.channel.awaitMessages({ filter, max: 1, time: 60000, errors: ['time'] });
          const roleMention = collectedRole.first().content;
    
          if (roleMention.startsWith('<@&') && roleMention.endsWith('>')) {
            const roleId = roleMention.slice(3, -1); // Kivonjuk az ID-t az említésből
            warnRoleIds.push(roleId);
          } else {
            return await interaction.followUp('Érvénytelen rang említés. Kérlek, próbáld újra.');
          }
        }
        const warnRoleIdsString = warnRoleIds.join(',');

        const rankNames = ['Szolgalati', 'Regisztracios', 'Alap', 'Leader', 'Vezetosegi', 'Szabadsag', 'Szobeli', 'Varakozas'];
        const additionalRoleIds = [];
      
          for (const rankName of rankNames) {
            await interaction.followUp(`Kérlek, add meg a(z) ${rankName} rangot említéssel:`);
            const collectedRole = await interaction.channel.awaitMessages({ filter, max: 1, time: 60000, errors: ['time'] });
            const roleMention = collectedRole.first().content;
      
            if (roleMention.startsWith('<@&') && roleMention.endsWith('>')) {
              const roleId = roleMention.slice(3, -1); // Kivonjuk az ID-t az említésből
              additionalRoleIds.push(roleId);
            } else {
              return await interaction.followUp('Érvénytelen rang említés. Kérlek, próbáld újra.');
            }
          }
          const def_Channels = ['Felhivas', 'Figyelmeztetes', 'Duty', 'Szabadsag'];
          const otherchannel = [];
        
            for (const name of def_Channels) {
              await interaction.followUp(`Kérlek, add meg a(z) ${name} szobát említéssel:`);
              const collectedChannel = await interaction.channel.awaitMessages({ filter, max: 1, time: 60000, errors: ['time'] });
              const channelMention = collectedChannel.first().content;
        
              if (channelMention.startsWith('<#') && channelMention.endsWith('>')) {
                const channelID = channelMention.slice(2, -1); // Kivonjuk az ID-t az említésből
                otherchannel.push(channelID);
              } else {
                return await interaction.followUp('Érvénytelen rang említés. Kérlek, próbáld újra.');
              }
            }
            await interaction.followUp(`Kérlek, add meg percben mi a minimum az ellenőrzés során amikor a rendszer ajánlja az előléptetést:`);
            const ranguptimeW = await interaction.channel.awaitMessages({ filter, max: 1, time: 60000, errors: ['time'] });
            const ranguptime = ranguptimeW.first().content;
            await interaction.followUp(`Kérlek, add meg percben mi a minimum teljesítendő szolgálati idő, alatta a rendszer figyelmeztetést javasol:`);
            const warntimeW = await interaction.channel.awaitMessages({ filter, max: 1, time: 60000, errors: ['time'] });
            const warntime = warntimeW.first().content;
            await interaction.followUp(`Kérlek, add meg hány naponta végeznél ellenőrzést (A figyelmeztetés 1 nappal később jár le automatikusan!):`);
            const ellenorzesw = await interaction.channel.awaitMessages({ filter, max: 1, time: 60000, errors: ['time'] });
            const ellenorzesd = ellenorzesw.first().content;
        // A figyelmeztetés rangok ID-k hozzáadása az adatbázisban már meglévő bejegyzéshez
       // await db.run(
        //  `UPDATE servers SET warns_ids = ? WHERE server_id = ?`, [warnRoleIdsString, serverid]);
    
        // Csatorna ID-k és rangok mentése az adatbázisba
        await db.run(
          `INSERT INTO servers (server_id, felki_log, roles_log, duty_log, now_log, warn_log, dutyonoff_log, szolgalatban_room, roles_ids, warns_ids, szolgalatban_id, reg_id, default_id, leader_id, vezetosegi_id, szabadsag_id, szobeli_id, varakozas_id, felhivasroom_id, warnroom_id, dutyroom, szabadroom_id, ranguptime, warntime, ellenorzes_days)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [serverid, ...channelIDs, roleIdsString, warnRoleIdsString, ...additionalRoleIds, ...otherchannel, ranguptime, warntime, ellenorzesd]);
    
        return interaction.followUp('Sikeresen létrehoztam a csatornákat és a kategóriát! Az ID-k mentésre kerültek.');
    
      } catch (error) {
        console.error(`Hiba a rangok bekérése közben: ${error}`);
        return interaction.followUp('Hiba történt a rangok bekérése közben.');
      }
    } 
    if(!this_server_id){
      return interaction.reply({content:`A bot nincs regisztálva a szerveren, kérlek használd a /konfiguralas parancsot!\n`,ephemeral: true});
    }*/
    const member = interaction.member;
    const server=await getServerConfig(serverid);
    const szolgalati=server.szolgalatban_id;
    const leader=server.leader_id;
    const alap=server.default_id;
    const dutylogszoba=server.duty_log;
    const regisztralt=server.reg_id;
    const szabadsag=server.szabadsag_id;
    const dutybekilogszoba=server.dutyonoff_log;
    const vezetosegi=server.vezetosegi_id;
    const rolesInDb = await db.get('SELECT roles_ids FROM servers WHERE server_id = ?', [serverid]);
    const rroles = rolesInDb.roles_ids.split(',').map(role => role.trim());
    const warningRoles = server.warns_ids;
    if(commandName==='help'){
      const helpEmbed = new EmbedBuilder()
      .setColor(0x2f3136) // Szürke háttérszín
      .setTitle('Parancsok')
      .setDescription(
          '`/duty` - Szolgálatba/ból belépés/kilépés.\n' +
          '`/adat` - Szolgálati idő lekérése.\n' +
          '`/megse` - Kilépés a szolgálatból mentés nélkül.\n' +
          '`/dicseret` - Szolgálati idő lekérése egy felhasználónak, és dícséret adása.\n' +
          '`/szabadsag` - Szabadságra menés.\n' +
          '`/munka` - Szabadságról visszajövetel.\n' +
          '`/getduty` - Szolgálati idő lekérése egy felhasználónak.\n' +
          '`/getinfo` - Információk lekérése a felhasználóról.\n' +
          '`/edituser` - Felhasználó információinak módosítása.\n' +
          '`/kileptet` - Szolgálatból való kiléptetés leader által.\n' +
          '`/figyelmeztetes` - Figyelmeztetés kiosztása.\n' +
          '`/figylevetel` - Figyelmeztetés levétele.\n' +
          '`/torol` - Szolgálati idő törlése egy felhasználónak.\n' +
          '`/hozzaad` - Szolgálati idő hozzáadása egy felhasználóhoz.\n' +
          '`/visszavon` - Szolgálati idő elvétele egy felhasználótól.\n' +
          '`/osszes` - Összes szolgálati idő lekérése az adott időszakban.\n' +
          '`/osszesfrakcio` - Összes szolgálati idő lekérése a frakcióba csatlakozástól fogva.\n' +
          '`/reset` - Összes szolgálati idő törlése.\n' +
          '`/ellenorzes` - Szolgálati idő ellenőrzése.\n' +
          '`/felvesz` - Felvétel az állományba egy felhasználót.\n' +
          '`/szobeli` - Szóbeli és Rendvédelmis rang rátétele.\n' +
          '`/rangup` - Feljebb léptet egy felhasználót a ranglistán.\n' +
          '`/lefokoz` - Lefokoz egy felhasználót a ranglistán.\n' +
          '`/kirug` - Állományból való kirúgás.\n' +
          '`/addfeketelista` - Feketelistához hozzáadás.\n' +
          '`/userdelete` - Felhasználói információk eltávolítása az adatbázisból.\n' +
          '`/telepit` - Duty és szabadság panel telepítése.\n' +
          '`/konfiguralas` - Új szerver bekonfigurálása.\n' +
          '`/check` - Figyelmeztetések és szabadság ellenőrzése.'
      );

  // Embed elküldése
  await interaction.reply({ embeds: [helpEmbed], ephemeral: true });
    }
    if (commandName === 'duty') {
      if (!member.roles.cache.has(server.reg_id)) {
        interaction.reply({ content: 'Nem vagy regisztrálva, nyiss ticketet és egy leader regisztrál!', ephemeral: true });
        return;
    }
    if (member.roles.cache.has(server.szabadsag_id)) {
      interaction.reply({ content: 'Szabadságon vagy, kérlek használd a /munka parancsot!', ephemeral: true });
      return;
  }
    
        if(member.roles.cache.has(szolgalati)){
        await member.roles.remove(szolgalati);
        //await szolgalatbanRoom(server,serverid);
        const row = await db.get('SELECT time_on_duty FROM duty_logs WHERE server_id = ? AND user_id = ?', [serverid,member.id]);
        await db.get('DELETE FROM duty_logs WHERE server_id = ? AND user_id = ?', [serverid,member.id]);
        if (row) {
          const currentTimeOnDuty = Math.floor((Date.now() - row.time_on_duty) / 60000);
          if(currentTimeOnDuty<660){
            const naploSzoba = interaction.guild.channels.cache.get(dutylogszoba);
            if (naploSzoba) {
              // Küldjük el a naplózási üzenetet a meghatározott szobába
              naploSzoba.send(`<@${member.user.id}> ${convert(currentTimeOnDuty)} duty időt mentett!\n`);
            }
            const bekilog=interaction.guild.channels.cache.get(dutybekilogszoba);
            if (bekilog) {
              // Küldjük el a naplózási üzenetet a meghatározott szobába
              bekilog.send(`<@${member.user.id}> kilépett a szolgálatból!\n`);
            } else {
              //console.log('A naplózási szoba nem található vagy nem üzenhető!');
            }
            await db.run('INSERT INTO duty (server_id, user_id, time_on_duty) VALUES (?, ?, ?)', [serverid, member.id, currentTimeOnDuty]);
            await db.run('INSERT INTO osszes_duty (server_id, user_id, time_on_duty) VALUES (?, ?, ?)', [serverid, member.id, currentTimeOnDuty]);
            const osszes = await db.get('SELECT SUM(time_on_duty) AS total_time FROM duty WHERE server_id = ? AND user_id = ?', [serverid, member.id]);
            interaction.reply({content:`Kiléptél a szolgálatból. Összesen ${convert(currentTimeOnDuty)}et voltál szolgálatban. Összesen: ${convert(osszes.total_time)}`,ephemeral: true});
            //delete dutyStatus[member.id];
            await updateDutyMessage(server.server_id);
          }else if(currentTimeOnDuty<=860 && 660<=currentTimeOnDuty){
            const naploSzoba = interaction.guild.channels.cache.get(dutylogszoba);
            if (naploSzoba) {
              // Küldjük el a naplózási üzenetet a meghatározott szobába
              naploSzoba.send(`GYANÚS -> <@${member.user.id}> ${convert(currentTimeOnDuty)} duty időt mentett!\n`);
            }
            const bekilog=interaction.guild.channels.cache.get(dutybekilogszoba);
            if (bekilog) {
              // Küldjük el a naplózási üzenetet a meghatározott szobába
              bekilog.send(`<@${member.user.id}> kilépett a szolgálatból!\n`);
            } else {
              //console.log('A naplózási szoba nem található vagy nem üzenhető!');
            }
            await db.run('INSERT INTO duty (server_id, user_id, time_on_duty) VALUES (?, ?, ?)', [serverid, member.id, currentTimeOnDuty]);
            await db.run('INSERT INTO osszes_duty (server_id, user_id, time_on_duty) VALUES (?, ?, ?)', [serverid, member.id, currentTimeOnDuty]);
            const osszes = await db.get('SELECT SUM(time_on_duty) AS total_time FROM duty WHERE server_id = ? AND user_id = ?', [serverid, member.id]);
            interaction.reply({content:`Kiléptél a szolgálatból. Összesen ${convert(currentTimeOnDuty)}et voltál szolgálatban. Összesen: ${convert(osszes.total_time)}`,ephemeral: true});
            //delete dutyStatus[member.id];
            await updateDutyMessage(server.server_id);
          }else {
            const osszes = await db.get('SELECT SUM(time_on_duty) AS total_time FROM duty WHERE server_id = ? AND user_id = ?', [serverid, member.id]);
            interaction.reply({content:`Kiléptél a szolgálatból. Átlépted a mentési limitet, ezért a mentés nem történt meg. Összesen: ${convert(osszes.total_time)}`,ephemeral: true});
            await updateDutyMessage(server.server_id);
          }
        }

        }else{
          // "/duty be logikája"
          const now = Date.now();
          await member.roles.add(szolgalati);
          //await szolgalatbanRoom(server,serverid);
          await db.run('INSERT INTO duty_logs (server_id, user_id, time_on_duty) VALUES (?, ?, ?)', [serverid, member.id, now]);
          const bekilog=interaction.guild.channels.cache.get(dutybekilogszoba);
          if (bekilog) {
            // Küldjük el a naplózási üzenetet a meghatározott szobába
            bekilog.send(`<@${member.user.id}> szolgálatba lépett!\n`);
          } else {
            //console.log('A naplózási szoba nem található vagy nem üzenhető!');
          }
          interaction.reply({ content: 'Szolgálatba léptél!', ephemeral: true });
          //dutyStatus[member.id] = { date: now };
          await updateDutyMessage(server.server_id);
        }
    }
    if(commandName === 'szabadsag') {
      const szabadsagszoba = client.channels.cache.get(server.szabadroom_id); // A csatorna azonosítója
      if (member.roles.cache.has(szabadsag)) {
          interaction.reply({ content: 'Már szabadságon vagy!', ephemeral: true });
          return;
      }
  
      const date = options.getInteger('date');
      const timestamp = Math.floor(Date.now() / 1000) + date * 24 * 60 * 60;
      const reason = options.getString('reason');
  
      szabadsagszoba.send(`**Discord:** <@${member.id}>\n**Szabadságon:** ${date} napig.\n**Indok:** ${reason}`);
  
      try {
          await db.run('INSERT INTO szabadsag (server_id, user_id, reason, timestamp) VALUES (?, ?, ?, ?)', [serverid, member.id, reason, timestamp]);
          await member.roles.add(szabadsag);
          interaction.reply({ content: 'Sikeresen kivettél szabadságot! Jó pihenést!', ephemeral: true });
      } catch (err) {
          console.error('Error adding szabadsag:', err.message);
          interaction.reply({ content: 'Hiba történt a szabadság kivétele közben!', ephemeral: true });
      }
  }
      if(commandName==='munka'){
        if (!member.roles.cache.has(szabadsag)) {
          interaction.reply({ content: 'Nem vagy szabadságon!', ephemeral: true });
          return;
         }
         await db.run('DELETE FROM szabadsag WHERE server_id = ? AND user_id <= ?', serverid, member.id);
         member.roles.remove(szabadsag);
         interaction.reply({ content: 'Sikeresen munkába álltál! Jó játékot kívánunk!', ephemeral: true })
      }
    if(commandName==='telepit'){
      if (!member.roles.cache.has(leader)) {
        interaction.reply({ content: 'Nincs jogosultságod hozzá!', ephemeral: true });
        return;
    }
    if (!server || !server.dutyroom) {
      interaction.reply({ content: 'Hiányzó konfigurációs beállítások. Kérlek ellenőrizd az adatbázist.', ephemeral: true });
      return;
    }
    const dutyszoba = await client.channels.fetch(server.dutyroom); // A csatorna azonosítója
    const buttonrow = new ActionRowBuilder()
    .addComponents(
        new ButtonBuilder()
            .setCustomId('dutybe_button') // Egyedi azonosító a gombnak
            .setLabel('Szolgálatba lépés')
            .setStyle(ButtonStyle.Success), // Zöld gomb
        new ButtonBuilder()
            .setCustomId('dutyki_button')
            .setLabel('Szolgálatból kilépés')
            .setStyle(ButtonStyle.Danger), // Piros gomb
        new ButtonBuilder()
            .setCustomId('megsebutton')
            .setLabel('Mégse')
            .setStyle(ButtonStyle.Secondary), // Sárga gomb
        new ButtonBuilder()
            .setCustomId('adatbutton')
            .setLabel('Szolgálati idő lekérése')
            .setStyle(ButtonStyle.Primary) // Szürke gomb
    );
    /*const buttonrow2 = new ActionRowBuilder()
    .addComponents(
        new ButtonBuilder()
            .setCustomId('szabadsag') // Egyedi azonosító a gombnak
            .setLabel('Szabadság kivétele')
            .setStyle(ButtonStyle.Danger), // Piros gomb
        new ButtonBuilder()
            .setCustomId('munka')
            .setLabel('Szolgálatból kilépés')
            .setStyle(ButtonStyle.Success), // Zöld gomb
    );*/

// Az üzenet elküldése a megadott csatornába
  dutyszoba.send({ content: 'Válassz egy lehetőséget:', components: [buttonrow] })
  .then(() => console.log('Gombok elküldve a csatornába'))
  .catch(error => console.error('Hiba történt az üzenet küldése közben:', error));
  /*szabadsagszoba.send({ content: 'Válassz egy lehetőséget:', components: [buttonrow2] })
  .then(() => console.log('Gombok elküldve a csatornába'))
  .catch(error => console.error('Hiba történt az üzenet küldése közben:', error));*/
  interaction.reply({ content: 'Sikeres telepítés!', ephemeral: true });
    }
    if (commandName === 'check') {
      if (!member.roles.cache.has(leader)) {
        interaction.reply({ content: 'Nincs jogosultságod hozzá!', ephemeral: true });
        return;
      }
      const guild6 = interaction.guild;
      await checkwarn(guild6);
      await checkszab(guild6);
      interaction.reply({ content: 'Sikeres ellenőrzés!', ephemeral: true });
    }
    if(commandName==='adat'){
      const totalDutyTime = await getTotalDutyTime(serverid, member.id);
      const roleDate = await getRoleDate(serverid, member.id);
      const daysOnRole = calculateDaysOnRole(roleDate);
      const total=await getTotalDutyTimeFaction(serverid, member.id);
      interaction.reply({content:`Összesen ${convert(totalDutyTime)} volt szolgálatban az utolsó ellenőrzés óta.\nÖsszesen ${convert(total)} volt szolgálatban amióta a frakcióban van.\nEnnyi ideje van a rangon: ${daysOnRole} nap.`,ephemeral: true});
    }
    if(commandName=='reset'){
      if (!member.roles.cache.has(leader)) {
        interaction.reply({ content: 'Nincs jogosultságod hozzá!', ephemeral: true });
        return;
    }
        await db.get('DELETE FROM duty WHERE server_id = ?', [interaction.guild.id]);
        //await db.get('DELETE FROM duty_logs WHERE server_id = ?', [interaction.guild.id]);
        await db.get('DELETE FROM dicseretek WHERE server_id = ?', [interaction.guild.id]);
        interaction.reply({ content: 'Sikeresen törölted a duty időket és a dícséreteket!\n', ephemeral: true });
      }
    if (commandName === 'hozzaad') {
      if (!member.roles.cache.has(leader)) {
        interaction.reply({ content: 'Nincs jogosultságod hozzá!', ephemeral: true });
        return;
    }

      const taggedUser = options.get('user').value;
      const minutesToAdd = parseInt(options.get('minutes').value);

      if (!taggedUser || isNaN(minutesToAdd)) {
          interaction.reply({ content: 'Hibás parancs használat. Kérlek, használd ezt: `/hozzaad [discord tag] [perc]`', ephemeral: true });
          return;
      }

      const taggedMember = interaction.guild.members.cache.get(taggedUser);

      if (!taggedMember) {
          interaction.reply({ content: 'Nem található a megjelölt felhasználó a szerveren.', ephemeral: true });
          return;
      }

      const currentTime = Date.now();
      await db.run('INSERT INTO duty (server_id, user_id, time_on_duty) VALUES (?, ?, ?)', [serverid, taggedUser, minutesToAdd]);
      await db.run('INSERT INTO osszes_duty (server_id, user_id, time_on_duty) VALUES (?, ?, ?)', [serverid, taggedUser, minutesToAdd]);

      interaction.reply({ content: `Hozzáadtál ${minutesToAdd} percet ${taggedMember.displayName}-nak a szolgálati idejéhez!`, ephemeral: true });
  }
    if(commandName==='osszes'){
      if (!member.roles.cache.has(leader)) {
        interaction.reply({ content: 'Nincs jogosultságod hozzá!', ephemeral: true });
        return;
    }
      const sql = 'SELECT user_id, SUM(time_on_duty) AS total_time FROM duty WHERE server_id = ? GROUP BY user_id';
      const dutyData = await db.all(sql, serverid);
      if (dutyData.length === 0) {
        interaction.reply({content:'Nincs elérhető szolgálati adat!\n',ephemeral: true});
        return;
      }
    
      let messages = [];
      let currentMessage = '';
    
      dutyData.forEach((data) => {
        const { user_id, total_time } = data;
        const newLine = `<@${user_id}> Összes duty: ${convert(total_time)}.\n`;
    
        if (currentMessage.length + newLine.length > 2000) {
          messages.push(currentMessage);
          currentMessage = newLine;
        } else {
          currentMessage += newLine;
        }
      });
    
      // Add the last message if it's not empty
      if (currentMessage.length > 0) {
        messages.push(currentMessage);
      }
    
      // Send messages
      messages.forEach((msg, index) => {
        setTimeout(() => {
          interaction.channel.send(msg);
        }, index * 1000); // Adjust the delay if needed
      });
    }
    if(commandName==='osszesfrakcio'){
      if (!member.roles.cache.has(leader)) {
        interaction.reply({ content: 'Nincs jogosultságod hozzá!', ephemeral: true });
        return;
    }
      const sql = 'SELECT user_id, SUM(time_on_duty) AS total_time FROM osszes_duty WHERE server_id = ? GROUP BY user_id';
      const dutyData = await db.all(sql, serverid);
      if (dutyData.length === 0) {
        interaction.reply({content:'Nincs elérhető szolgálati adat!\n',ephemeral: true});
        return;
      }
    
      let messages = [];
      let currentMessage = '';
    
      dutyData.forEach((data) => {
        const { user_id, total_time } = data;
        const newLine = `<@${user_id}> Összes duty: ${convert(total_time)}.\n`;
    
        if (currentMessage.length + newLine.length > 2000) {
          messages.push(currentMessage);
          currentMessage = newLine;
        } else {
          currentMessage += newLine;
        }
      });
    
      // Add the last message if it's not empty
      if (currentMessage.length > 0) {
        messages.push(currentMessage);
      }
    
      // Send messages
      messages.forEach((msg, index) => {
        setTimeout(() => {
          interaction.channel.send(msg);
        }, index * 1000); // Adjust the delay if needed
      });
    }
    if(commandName==='megse'){
      if (member.roles.cache.has(szolgalati)) {
        await db.get('DELETE FROM duty_logs WHERE user_id = ? AND server_id = ?', [member.id,serverid]);
        await member.roles.remove(szolgalati);
        await updateDutyMessage(server.server_id);
        const bekilog=interaction.guild.channels.cache.get(dutybekilogszoba);
            if (bekilog) {
              // Küldjük el a naplózási üzenetet a meghatározott szobába
              bekilog.send(`<@${member.user.id}> kilépett a szolgálatból, de nem mentette el az időt!\n`);
            } else {
              //console.log('A naplózási szoba nem található vagy nem üzenhető!');
            }
        interaction.reply({content:'Sikeresen eltávolítva rólad a Szolgálati rang!',ephemeral: true});
      }else {
        interaction.reply({content:'Nem vagy szolgálatban.',ephemeral: true});
      }
    }
    if(commandName==='kileptet'){
      if (!member.roles.cache.has(leader) && !member.roles.cache.has(vezetosegi)) {
        interaction.reply({ content: 'Nincs jogosultságod hozzá!', ephemeral: true });
        return;
      }
      
      const taggedUser = options.getUser('user');
      if (!taggedUser) {
        return interaction.reply({content:'Kérlek említs meg egy felhasználót.',ephemeral: true});
      }
      const taggedMember = interaction.guild.members.cache.get(taggedUser.id);
      if(taggedMember){
        if (!taggedMember.roles.cache.has(szolgalati)) {
          interaction.reply({ content: 'Nincs szolgálatban az illető!', ephemeral: true });
          return;
        }
        await updateDutyMessage(server.server_id);
        await db.get('DELETE FROM duty_logs WHERE user_id = ? AND server_id = ?', [taggedMember.id,serverid]);
        await taggedMember.roles.remove(szolgalati);
        const bekilog=interaction.guild.channels.cache.get(dutybekilogszoba);
        bekilog.send(`<@${taggedMember.id}>-t kiléptette <@${member.id}> a szolgálatból!`);
        interaction.reply({content:`Sikeresen kiléptetted ${taggedMember.displayName}-t a szolgálatból és törölted az adatait.`,ephemeral: true});
      }

    }
    if(commandName==='torol'){
      const taggedUser = options.getUser('user');

        if (!taggedUser) {
          return interaction.reply({content:'Kérlek említs meg egy felhasználót.',ephemeral: true});
        }
      
        const taggedMember = interaction.guild.members.cache.get(taggedUser.id);
      
        if (!taggedMember) {
          return interaction.reply({content:'A megjelölt felhasználó nem található a szerveren.',ephemeral: true});
        }
      
        try {
          await db.run('DELETE FROM duty WHERE user_id = ? AND server_id = ?', [taggedMember.id, serverid]);
          await db.run('DELETE FROM osszes_duty WHERE user_id = ? AND server_id = ?', [taggedMember.id, serverid]);
          interaction.reply({content:'Sikeresen törölve.',ephemeral: true});
        } catch (error) {
          console.error('Hiba történt a törlés közben:', error);
          interaction.reply('Hiba történt a törlés közben.');}
    }
    if (commandName === 'getduty') {
      if (!member.roles.cache.has(leader) && !member.roles.cache.has(vezetosegi)) {
        interaction.reply({ content: 'Nincs jogosultságod hozzá!', ephemeral: true });
        return;
      }
      const user = options.getUser('user');
      if (!user) {
          interaction.reply({ content: 'Érvénytelen felhasználó!', ephemeral: true });
          return;
      }
        const totalDutyTime = await getTotalDutyTime(serverid, user.id);
        const roleDate = await getRoleDate(serverid, user.id);
        const factionDate = await getFactionDate(serverid, user.id);
        console
        const daysOnRole = calculateDaysOnRole(roleDate);
        const daysInFaction = calculateDaysOnRole(factionDate);
        const total=await getTotalDutyTimeFaction(serverid, user.id);
        interaction.reply({
            content: `Discord név: <@${user.id}>\nÖsszesen ${convert(totalDutyTime)} volt szolgálatban az utolsó ellenőrzés óta.\nÖsszesen ${convert(total)} volt szolgálatban amióta a frakcióban van.\nEnnyi ideje van a rangon: ${daysOnRole} nap.\nEnnyi ${daysInFaction} napja van a frakcióban.`,
            ephemeral: true
        });
    }
    if (commandName === 'getinfo') {
      if (!member.roles.cache.has(leader) && !member.roles.cache.has(vezetosegi)) {
          interaction.reply({ content: 'Nincs jogosultságod hozzá!', ephemeral: true });
          return;
      }
  
      const icnev = options.getString('icnev');
      const badgenum = options.getString('badgenum');
      const kodnev = options.getString('kodnev');
      const steam=options.getString('steam');
      const discord_id = options.getString('discord_id') || options.getUser('user')?.id;
  
      if (!icnev && !badgenum && !kodnev && !discord_id && !steam) {
          interaction.reply({ content: 'Nem adtál meg keresési feltételt!', ephemeral: true });
          return;
      }
  
      let query = 'SELECT * FROM users WHERE ';
      let values = [];
  
      if (icnev) {
          query += 'icName = ? ';
          values.push(icnev);
      } else if (badgenum) {
          query += 'badgenum = ? ';
          values.push(badgenum);
      }else if (steam) {
        query += 'steamName = ? ';
        values.push(steam);
    } else if (kodnev) {
          query += 'codeName = ? ';
          values.push(kodnev);
      } else {
          query += 'user_id = ? ';
          values.push(discord_id);
      }
      query+= 'AND server_id = ? ';
      values.push(serverid);
      const rows = await db.get(query, values);
  
      if (!rows) {
          interaction.reply({ content: 'Nincs találat az adatbázisban!', ephemeral: true });
          return;
      }
  
      const ID = rows.user_id || discord_id;
  
      interaction.reply({
          content: `Adatlekérdezés:\nDiscord ID: ${ID}\nDiscord Tag: <@${ID}>\nIC Név: ${rows.icName}\nKódnév: ${rows.codeName}\nSteam Név: ${rows.steamName}\nJelvényszám: ${rows.badgenum}\nTelefonszám: ${rows.phoneNum}`,
          ephemeral: true
      });
  }
  if (commandName === 'edituser') {
    if (!member.roles.cache.has(leader)) {
        interaction.reply({ content: 'Nincs jogosultságod hozzá!', ephemeral: true });
        return;
    }

    const icnev = options.getString('icnev');
    const badgenum = options.getString('badgenum');
    const kodnev = options.getString('kodnev');
    const steam = options.getString('steam');
    const phonenum=options.getString('phonenum');
    const discord_id = options.getUser('user')?.id;

    if (!icnev && !badgenum && !kodnev && !steam && !phonenum && !serverid) {
        interaction.reply({ content: 'Nem adtál meg módosítandó paramétert!', ephemeral: true });
        return;
    }

    let query = 'UPDATE users SET';
    let values = [];

    if (icnev) {
        query += ' icName = ?,';
        values.push(icnev);
    }
    if (badgenum) {
        query += ' badgenum = ?,';
        values.push(badgenum);
    }
    if (phonenum) {
      query += ' phoneNum = ?,';
      values.push(phonenum);
  }
    if (kodnev) {
        query += ' codeName = ?,';
        values.push(kodnev);
    }
    if (steam) {
        query += ' steamName = ?,';
        values.push(steam);
    }

    // Utolsó vessző eltávolítása a lekérdezésből
    query = query.slice(0, -1);

    query += ' WHERE user_id = ? AND server_id = ?';
    values.push(discord_id,serverid);

    await db.get(query, values);
    interaction.reply({
        content: `Sikeresen módosítva!`,
        ephemeral: true
    });
}
    if(commandName==='szobeli'){
      if (!member.roles.cache.has(leader) && !member.roles.cache.has(vezetosegi)) {
        interaction.reply({ content: 'Nincs jogosultságod hozzá!', ephemeral: true });
        return;
    }
    const userOption = options.getUser('user');

    if (!userOption) {
        interaction.reply({ content: 'Érvénytelen felhasználó!', ephemeral: true });
        return;
    } 
    const user = await interaction.guild.members.fetch(userOption);
    if (!user) {
        interaction.reply({ content: 'Nem található felhasználó!', ephemeral: true });
  }
    await user.roles.remove(server.varakozas_id);
    await user.roles.add([alap, server.szobeli_id]);
    interaction.reply({content:'Sikeresen művelet!',ephemeral: true});
}
if(commandName === 'felvesz') {
  if (!member.roles.cache.has(leader)) {
      return interaction.reply({ content: 'Nincs jogosultságod hozzá!', ephemeral: true });
  }

  const userOption = options.getUser('user');
  const usert = await interaction.guild.members.fetch(userOption);
  const icnev = options.getString('icnev');
  const codeName = options.getString('kodnev');
  const steam = options.getString('steam');
  const badgeNumber = options.getInteger('badgenum');
  const phonenum = options.getString('phonenum');

  if (!usert || !icnev || !codeName || !steam || !badgeNumber || !phonenum) {
      return interaction.reply({ content: 'Érvénytelen bemenet!', ephemeral: true });
  }

  if (usert.roles.cache.has(regisztralt)) {
      return interaction.reply({ content: 'Az illetőt már regisztrálták! Használd a /userdelete parancsot ha el szeretnéd távolítani kirúgás nélkül!', ephemeral: true });
  }

  const feketeinfo = await db.get('SELECT server_id, reason, vegleges FROM feketelista WHERE user_id = ?', [usert.id]);
  
  if (feketeinfo) {
      if (feketeinfo.vegleges === 0) {
          const guild = client.guilds.cache.get(feketeinfo.server_id);
          return interaction.reply({ content: `Figyelem az illető feketelistára került (NEM admin által!) Ezen a szerveren tették feketelistára: ${guild.name} Indok: ${feketeinfo.reason}`, ephemeral: true });
      } else if (feketeinfo.vegleges === 1) {
          return interaction.reply({ content: `Figyelem az illető feketelistára került (Admin által, tehát nem vehető fel!) Indok: ${feketeinfo.reason}`, ephemeral: true });
      }
  }

  const guild4 = await getGuild(serverid);
  const channel4 = guild4.channels.cache.get(server.felki_log);

  await db.run(`INSERT INTO users (server_id, user_id, icName, codeName, badgenum, phoneNum, steamName) VALUES (?, ?, ?, ?, ?, ?, ?)`, 
               [serverid, usert.id, icnev, codeName, badgeNumber, phonenum, steam]);

  channel4.send(`**Discord név:** *<@${usert.id}>*\n**IC Név:** *${icnev}*\n**Kódnév:** *${codeName}*\n**Jelvényszám:** *${badgeNumber}*\n**Telefonszám:** *${phonenum}*\n**Steam név:** *${steam}*\n\n`);
  try {
    await usert.roles.remove([server.varakozas_id,server.szobeli_id]);
    await usert.roles.add([alap,rroles[0],regisztralt]);
    await usert.setNickname(codeName);
  }catch (error) {
    console.error(error);
  }
  const promotionDate = new Date();
  await db.run('INSERT INTO rangon (server_id, user_id, date) VALUES (?, ?, ?)', [serverid, usert.id, promotionDate]);

  const staffNotificationChannel = interaction.guild.channels.cache.get(server.felhivasroom_id);
  if (staffNotificationChannel) {
      staffNotificationChannel.send(`**<@${member.id}> felvette <@${usert.id}>-t.**`);
      return interaction.reply({ content: 'Felhasználó felvétele sikeres volt!', ephemeral: true });
  } else {
      return interaction.reply({ content: 'Felhasználó felvétele sikertelen volt!', ephemeral: true });
  }
}

    if (commandName === 'rangup') {
      if (!member.roles.cache.has(leader)) {
        interaction.reply({ content: 'Nincs jogosultságod hozzá!', ephemeral: true });
        return;
      }
    
      const taggedUser = options.getUser('user');
      if (!taggedUser) {
        interaction.reply({ content: 'Érvénytelen felhasználó!', ephemeral: true });
        return;
      }
    
      const taggedMember = interaction.guild.members.cache.get(taggedUser.id);
      if (!taggedMember) {
        interaction.reply({ content: 'A megjelölt felhasználó nem található a szerveren!', ephemeral: true });
        return;
      }
      
      // Ellenőrzi, hogy a rangok léteznek-e
      if (rroles.length === 0) {
        interaction.reply({ content: 'Nincsenek beállítva rangok az adatbázisban!', ephemeral: true });
        return;
      }
    
      let currentRoleIndex = rroles.findIndex(role => taggedMember.roles.cache.has(role));
    
      if (currentRoleIndex === -1) {
        interaction.reply({ content: 'A felhasználón nincs megfelelő rang!', ephemeral: true });
        return;
      }
    
      if (currentRoleIndex < rroles.length - 1) {
        const previousRole = rroles[currentRoleIndex];
        const newRole = rroles[currentRoleIndex + 1];
    
        try {
          // Remove the previous role
          await taggedMember.roles.remove(previousRole);
    
          // Add the new role
          await taggedMember.roles.add(newRole);
    
          // Save promotion date to the database
          const promotionDate = new Date();
          await db.run('INSERT INTO rangon (server_id, user_id, date) VALUES (?, ?, ?)', [serverid, taggedUser.id, promotionDate]);
    
          interaction.reply({ content: 'Sikeresen előléptettél egy felhasználót!', ephemeral: true });
    
          // Mention the roles and the tagged member
          const mentionedRoles = interaction.guild.roles.cache.get(newRole).name;
          const mentionedMember = taggedMember.toString();
          const mentionedAuthor = interaction.user.toString();
    
          // Notify the user
          const userNotificationChannelId = server.felhivasroom_id; // Replace with the channel ID for user notifications
          const userNotificationChannel = interaction.guild.channels.cache.get(userNotificationChannelId);
    
          if (userNotificationChannel) {
            userNotificationChannel.send(`Gratulálok ${mentionedMember}! előléptetést kaptál! Új rangod: ${mentionedRoles}\n`);
          }
    
          // Notify the staff channel
          //const staffNotificationChannelId = '1185304682193748059'; // Replace with the channel ID for staff notifications
          const staffNotificationChannel = interaction.guild.channels.cache.get(server.roles_log);
    
          if (staffNotificationChannel) {
            staffNotificationChannel.send(`${mentionedAuthor} előléptette ${mentionedMember}. Jelenlegi rangja: ${mentionedRoles}`);
          }
        } catch (error) {
          console.error('Error during rangup command execution:', error);
          interaction.reply({ content: 'Hiba történt a művelet során!', ephemeral: true });
        }
      } else {
        interaction.reply({ content: 'Az illető már a legmagasabb rangon van!', ephemeral: true });
      }
    }    
    if (commandName === 'lefokoz') {
       //console.log('Roles in order:', rroles);
       if (!member.roles.cache.has(leader)) {
        interaction.reply({ content: 'Nincs jogosultságod hozzá!', ephemeral: true });
        return;
      }
    
      const taggedUser = options.getUser('user');
      if (!taggedUser) {
        interaction.reply({ content: 'Érvénytelen felhasználó!', ephemeral: true });
        return;
      }
    
      const taggedMember = interaction.guild.members.cache.get(taggedUser.id);
      if (!taggedMember) {
        interaction.reply({ content: 'A megjelölt felhasználó nem található a szerveren!', ephemeral: true });
        return;
      }
      
      // Ellenőrzi, hogy a rangok léteznek-e
      if (rroles.length === 0) {
        interaction.reply({ content: 'Nincsenek beállítva rangok az adatbázisban!', ephemeral: true });
        return;
      }
    
      let currentRoleIndex = rroles.findIndex(role => taggedMember.roles.cache.has(role));
    
      if (currentRoleIndex === -1) {
        interaction.reply({ content: 'A felhasználón nincs megfelelő rang!', ephemeral: true });
        return;
      }
    
      if (currentRoleIndex > 0) {
        const previousRole = rroles[currentRoleIndex];
        const newRole = rroles[currentRoleIndex - 1];
  
    
        try {
          // Remove the previous role
          await taggedMember.roles.remove(previousRole);
    
          // Add the new role
          await taggedMember.roles.add(newRole);
    
          // Save promotion date to the database
          const promotionDate = new Date();
          await db.run('INSERT INTO rangon (server_id, user_id, date) VALUES (?, ?, ?)', [serverid, taggedUser.id, promotionDate]);
    
          interaction.reply({ content: 'Sikeresen lefokoztál egy felhasználót!', ephemeral: true });
    
          // Mention the roles and the tagged member
          const mentionedRoles = interaction.guild.roles.cache.get(newRole).name;
          const mentionedMember = taggedMember.toString();
          const mentionedAuthor = interaction.user.toString();
    
          // Notify the user
          const userNotificationChannelId = server.felhivasroom_id; // Replace with the channel ID for user notifications
          const userNotificationChannel = interaction.guild.channels.cache.get(userNotificationChannelId);
    
          if (userNotificationChannel) {
            userNotificationChannel.send(`Sajnálom ${mentionedMember}! lefokozást kaptál! Új rangod: ${mentionedRoles}\n`);
          }
    
          // Notify the staff channel
          //const staffNotificationChannelId = '1185304682193748059'; // Replace with the channel ID for staff notifications
          const staffNotificationChannel = interaction.guild.channels.cache.get(server.roles_log);
    
          if (staffNotificationChannel) {
            staffNotificationChannel.send(`${mentionedAuthor} előléptette ${mentionedMember}. Jelenlegi rangja: ${mentionedRoles}`);
          }
        } catch (error) {
          console.error('Error during rangup command execution:', error);
          interaction.reply({ content: 'Hiba történt a művelet során!', ephemeral: true });
        }
      } else {
        interaction.reply({ content: 'Az illető már a legkisebb rangon van!', ephemeral: true });
      }
    }
    if(commandName==='addfeketelista'){
      if (!member.roles.cache.has(leader)) {
        interaction.reply({ content: 'Nincs jogosultságod hozzá!', ephemeral: true });
        return;
    }
      const taggedUser = options.getUser('user');
      const reason=options.getString('indok');
      const valasz=options.getInteger('opcio');
      const serverid2=interaction.guild.id;
      if(!taggedUser && !reason && !valasz){
        return interaction.reply({ content: 'Nem megfelelő adatbevitel, kérlek próbáld újra!', ephemeral: true });
      }
      await db.run('INSERT INTO feketelista (server_id, user_id, reason, vegleges) VALUES (?, ?, ?, ?)', [serverid2, taggedUser.id, reason, valasz]);
      return interaction.reply({ content: 'Sikeresen feketelistára helyezted az illetőt!', ephemeral: true });
  }
  if(commandName==='kirug'){
    if (!member.roles.cache.has(leader)) {
      interaction.reply({ content: 'Nincs jogosultságod hozzá!', ephemeral: true });
      return;
  }
    const taggedUser = options.getUser('user');
    const reason=options.getString('indok');
    const taggedUserID = taggedUser.id;
    const taggedMember = interaction.guild.members.cache.get(taggedUserID);
    if (!taggedMember) {
    return interaction.reply({content:'A megjelölt felhasználó nem található a szerveren.', ephemeral:true});
  }
      await deleteUserData(serverid, taggedUserID);
      

      const mentionedMember = taggedMember.toString();
      const mentionedAuthor = interaction.user.toString();
      interaction.reply({content:'Sikeresen kirúgtad az állományból.', ephemeral:true});
      // Notify the user
      const userNotificationChannelId = '1095767418858655874'; // Replace with the channel ID for user notifications
      const userNotificationChannel = interaction.guild.channels.cache.get(userNotificationChannelId);
  
      if (userNotificationChannel) {
        userNotificationChannel.send(`Ki lett rúgva ${mentionedMember} az állományból! Indok: ${reason}\n`);
      }
  
      // Notify the staff channel
      const staffNotificationChannel = interaction.guild.channels.cache.get(server.felki_log);
      //const channelIC='1182323472932818975';
  
      if (staffNotificationChannel) {
        staffNotificationChannel.send(`${mentionedAuthor} kirúgta ${mentionedMember}-t. Indok: ${reason}\n`);
        //channelIC.send(`IC ki lett rúgva ${mentionedMember}?`)
      }
      if (taggedMember) {
        taggedMember
          .kick({
            reason: 'Állományból való kirúgás!', // opcionális indok
          })
      } 
    }
    if (commandName === 'userdelete') {
      if (!member.roles.cache.has(leader)) {
        interaction.reply({ content: 'Nincs jogosultságod hozzá!', ephemeral: true });
        return;
    }
      const userOption = options.getString('discord_id');
      if (userOption) {
          const userID = userOption;
          //console.log("Törlés "+serverid);
          // Most már megvan a felhasználó ID-je, így törölheted az adatbázisból
          await deleteUserData(serverid, userID);
         interaction.reply({ content: `Sikeresen törölted az adatbázisban lévő adatait. ID: ${userID}`, ephemeral: true });
          return;
      } else {
          interaction.reply({ content: 'Sikertelen törlés az adatbázisból.', ephemeral: true });
          return;
      }
  }
    if(commandName==='visszavon'){
      if (!member.roles.cache.has(leader)) {
        interaction.reply({ content: 'Nincs jogosultságod hozzá!', ephemeral: true });
        return;
    }
      const taggedUser = options.get('user').value;
      let minutesToAdd = parseInt(options.get('minutes').value);
      minutesToAdd=minutesToAdd*(-1);
      if (!taggedUser || isNaN(minutesToAdd)) {
          interaction.reply({ content: 'Hibás parancs használat. Kérlek, használd ezt: `/visszavon [discord tag] [perc]`', ephemeral: true });
          return;
      }
      const taggedMember = interaction.guild.members.cache.get(taggedUser);

      if (!taggedMember) {
          interaction.reply({ content: 'Nem található a megjelölt felhasználó a szerveren.', ephemeral: true });
          return;
      }
      //const currentTime = Date.now();
      await db.run('INSERT INTO duty (server_id, user_id, time_on_duty) VALUES (?, ?, ?)', [serverid, taggedUser, minutesToAdd]);
      await db.run('INSERT INTO osszes_duty (server_id, user_id, time_on_duty) VALUES (?, ?, ?)', [serverid, taggedUser, minutesToAdd]);
      interaction.reply({ content: `Elvettél ${minutesToAdd} percet ${taggedMember.displayName}-nak a szolgálati idejéből!`, ephemeral: true });
    }
    
    if (commandName === 'ellenorzes') {
      if (!member.roles.cache.has(leader)) {
        interaction.reply({ content: 'Nincs jogosultságod hozzá!', ephemeral: true });
        return;
    }
      const warningThreshold = server.warntime; // A figyelmeztető időkorlát percben
      const promotionThreshold = server.ranguptime; // A rangfelemelés időkorlát percben
  
      // Lekérjük az összes felhasználót az adatbázisból
      const users = await db.all('SELECT user_id FROM users WHERE server_id = ?', [serverid]);
  
      // Felhasználók és az összes duty idejének gyűjtése
      let messageContent = '';
      
      for (const user of users) {
          const userID = user.user_id;
          const totalDutyTime = await getTotalDutyTime(serverid, userID);
          const dicsnum=  await getDicseretNum(serverid, userID);
          //const user1 = await interaction.guild.members.fetch(userID);
          if(totalDutyTime<warningThreshold){
              messageContent += `<@${userID}> : **Összes duty idő: ${convert(totalDutyTime)}. !Figyelmeztetés!** *(Kivétel ha szabadságon van)*\n`;
              //figychannel.send(`**Név:** *<@${userID}>*\n**Figyelmeztetés:** *+1*\n**Indok:** *Inaktívitás*\n*Ha szabadságon vagy ne vedd figyelembe ezt az üzenetet!*`);
          }else if(totalDutyTime>=promotionThreshold){
            const roleDate = await getRoleDate(serverid, userID);
            const daysOnRole = calculateDaysOnRole(roleDate);
            if(dicsnum>0){
              messageContent += `<@${userID}> : **Összes duty idő: ${convert(totalDutyTime)}. !Rang Up!** *Ezen a rangon van: ${daysOnRole}* napja. *Dícséretek száma: ${dicsnum}*\n`;
            }else {
              messageContent += `<@${userID}> : **Összes duty idő: ${convert(totalDutyTime)}. !Rang Up!** *Ezen a rangon van: ${daysOnRole}* napja.\n`;
            }

          }else {
            if(dicsnum>0){
              messageContent += `<@${userID}> : **Összes duty idő: ${convert(totalDutyTime)}.** *Dícséretek száma: ${dicsnum}*\n`;
            }else {
              messageContent += `<@${userID}> : **Összes duty idő: ${convert(totalDutyTime)}.**\n`;
            }
          }
          
      }
  
      // Az üzenetek felosztása 2000 karakterenként
      const chunks = splitText(messageContent, 2000);
  
      // Üzenetek küldése a megadott csatornába
      const notificationChannel = interaction.channel;
      if (notificationChannel) {
          for (const chunk of chunks) {
            if(chunk){
              notificationChannel.send(chunk);
          }
          }
      }
  
      interaction.reply({ content: 'A felhasználók szolgálati idejének ellenőrzése kész. Használd a "/reset" parancsot!', ephemeral: true });
  }
  
  // Függvény a szöveg felosztására több üzenetre, figyelembe véve a 2000 karakteres korlátot
  function splitText(text, maxChar) {
      const chunks = [];
      let currentChunk = '';
      const lines = text.split('\n');
  
      for (const line of lines) {
          if (currentChunk.length + line.length <= maxChar) {
              currentChunk += line + '\n';
          } else {
              chunks.push(currentChunk);
              currentChunk = line + '\n';
          }
      }
  
      if (currentChunk.length > 0) {
          chunks.push(currentChunk);
      }
  
      return chunks;
  }
  if (commandName === 'figylevetel') {
    if (!member.roles.cache.has(leader)) {
      interaction.reply({ content: 'Nincs jogosultságod hozzá!', ephemeral: true });
      return;
    }
  
    const taggedUser = options.getUser('user');
    const reason = options.getString('reason');
    const logchannel=interaction.guild.channels.cache.get(server.warn_log);
    if (reason && taggedUser) {
      const taggedUserID = taggedUser.id;
  
      try {
        const rows = await db.all('SELECT roleid FROM warnings WHERE server_id = ? AND user_id = ?', [serverid,taggedUserID]);
        const roleID = rows[0]?.roleid;
  
        if (roleID) {
          // Fetch the guild member from the guild
          const guildMember = await interaction.guild.members.fetch(taggedUserID);
  
          if (guildMember) {
            await guildMember.roles.remove(roleID);
            await db.run('DELETE FROM warnings WHERE server_id = ? AND user_id = ? AND roleid = ?', [serverid, taggedUserID, roleID]);
            interaction.reply({ content: 'Sikeresen eltávolítottad a figyelmeztetést!', ephemeral: true });
            logchannel.send(`<@${member.id}> eltávolította <@${taggedUserID}>,  ${guildMember.guild.roles.cache.get(roleID).name} figyelmeztetését. Indok: ${reason}\n`);
          } else {
            interaction.reply({ content: 'Nem található a felhasználó a szerveren!', ephemeral: true });
          }
        } else {
          interaction.reply({ content: 'Nem található az adatbázisban figyelmeztetések között!', ephemeral: true });
        }
      } catch (error) {
        console.error('Error during figylevetel command execution:', error);
        interaction.reply({ content: 'Hiba történt a művelet során!', ephemeral: true });
      }
    } else {
      interaction.reply({ content: 'Sikertelen művelet!', ephemeral: true });
    }
  }
  if (commandName === 'dicseret') {
    if (!member.roles.cache.has(leader) && !member.roles.cache.has(vezetosegi)) {
      interaction.reply({ content: 'Nincs jogosultságod hozzá!', ephemeral: true });
      return;
    }
  
    const row = await db.get('SELECT COUNT(from_id) AS count FROM dicseretek WHERE server_id = ? AND from_id = ?', [serverid, member.id]);
    const taggedUser = options.getUser('user');
    const reason = options.getString('reason');
  
    if (row.count <= 3) {  // itt használjuk a count értéket, amit a lekérdezés visszaad
      db.run('INSERT INTO dicseretek (server_id, user_id, reason, from_id) VALUES (?, ?, ?, ?)', [serverid, taggedUser.id, reason, member.id]);
      taggedUser.send(`Dícséretet kaptál a következő indokkal: ${reason}. Gratulálunk, így tovább!`);
      interaction.reply({ content: 'Sikeres művelet!', ephemeral: true });
    } else {
      interaction.reply({ content: 'Sikertelen művelet, elérted a maximum osztható dícséretek számát!', ephemeral: true });
    }
  }
    if (commandName === 'figyelmeztetes') {
      if (!member.roles.cache.has(leader) && !member.roles.cache.has(vezetosegi)) {
          interaction.reply({ content: 'Nincs jogosultságod hozzá!', ephemeral: true });
          return;
      }
      const figychannel = interaction.guild.channels.cache.get(server.warnroom_id);
      if (!figychannel) {
          interaction.reply({ content: 'Érvénytelen figyelmeztetési csatorna!', ephemeral: true });
          return;
      }
      const user = options.getMember('user');
      if (!user) {
          interaction.reply({ content: 'Érvénytelen felhasználó!', ephemeral: true });
          return;
      }
      const logchannel=await client.channels.fetch(server.warn_log);
      const reason = options.getString('reason');
      let level = 1; // Alapértelmezett figyelmeztetési szint
      let roleID; // Deklaráljuk a roleID változót, amit az if blokkon belül állítunk majd be
      const roleIds = warningRoles.split(',').map(id => id.trim());
      for (const roleID of roleIds) {
          if (user.roles.cache.has(roleID)) {
              level++;
          } else {
              break;
          }
      }
      if (level <= roleIds.length) {
          //Ha a szint nem haladja meg a maximális szintet, adjunk hozzá egy figyelmeztetést
          roleID = roleIds[level - 1];
          const role = interaction.guild.roles.cache.get(roleID);
          if (role && user.id) {
              await user.roles.add(role)
                  .then(console.log(`Added role ${role.name} to ${user.user.tag}`))
                  .catch(console.error);
              figychannel.send(`**Név:** <@${user.id}>\n**Figyelmeztetés:** ${role.name}\n**Indok:** ${reason}\nFigyelmeztette: <@${member.id}>\n*Felebezzés esetén nyiss vezetőségi ticketet!*`);
              interaction.reply({ content: `${user.toString()} figyelmeztetve lett. Indok: ${reason}`, ephemeral: true });
              logchannel.send(`<@${member.id}> figyelmeztetést adott <@${user.id}>-nak,  ${role.name} figyelmeztetést. Indok: ${reason}\n`);
          } else {
              console.error(`Role with ID ${roleID} not found.`);
              interaction.reply({ content: 'Hiba történt a figyelmeztetés hozzáadásakor.', ephemeral: true });
          }
      } else {
          //Ha elérte a maximális figyelmeztetési szintet
          interaction.reply('A felhasználó már elérte a maximális figyelmeztetési szintet.');
      }
  
      //Figyelmeztetés hozzáadása az adatbázishoz
      const timestamp = Math.floor(Date.now() / 1000);
      db.run('INSERT INTO warnings (server_id, user_id, reason, timestamp, roleid) VALUES (?, ?, ?, ?, ?)', [serverid, user.id, reason, timestamp, roleID], (err) => {
          if (err) {
              console.error('Error adding warning:', err.message);
          } else {
              //console.log('Warning added successfully.');
          }
      });
  }
  
  }else if(interaction.isButton()){
    const { customId, user, message } = interaction;
    const member = interaction.member;
    const serverid=interaction.guild.id;
    const server=await getServerConfig(serverid);
    const szolgalati=server.szolgalatban_id;
    const dutylogszoba=server.duty_log;
    const regisztralt=server.reg_id;
    const szabadsag=server.szabadsag_id;
    const dutybekilogszoba=server.dutyonoff_log;
    if(customId==='dutyki_button'){
      if (!member.roles.cache.has(regisztralt)) {
        interaction.reply({ content: 'Nem vagy regisztrálva, nyiss ticketet és egy leader regisztrál!', ephemeral: true });
        return;
    }
      if(member.roles.cache.has(szolgalati)){
        await member.roles.remove(szolgalati);
        
      const row = await db.get('SELECT time_on_duty FROM duty_logs WHERE user_id = ? AND server_id = ?', [member.id, serverid]);
      await db.get('DELETE FROM duty_logs WHERE user_id = ? AND server_id = ?', [member.id,serverid]);
      await updateDutyMessage(serverid);
      if (row) {
        const currentTimeOnDuty = Math.floor((Date.now() - row.time_on_duty) / 60000);
        if(currentTimeOnDuty<660){
          const naploSzoba = interaction.guild.channels.cache.get(dutylogszoba);
          if (naploSzoba) {
            // Küldjük el a naplózási üzenetet a meghatározott szobába
            naploSzoba.send(`<@${member.user.id}> ${convert(currentTimeOnDuty)} duty időt mentett!\n`);
          }
          const bekilog=interaction.guild.channels.cache.get(dutybekilogszoba);
          if (bekilog) {
            // Küldjük el a naplózási üzenetet a meghatározott szobába
            bekilog.send(`<@${member.user.id}> kilépett a szolgálatból!\n`);
          } else {
            //console.log('A naplózási szoba nem található vagy nem üzenhető!');
          }
          await db.run('INSERT INTO duty (server_id, user_id, time_on_duty) VALUES (?, ?, ?)', [serverid, member.id, currentTimeOnDuty]);
          await db.run('INSERT INTO osszes_duty (server_id, user_id, time_on_duty) VALUES (?, ?, ?)', [serverid, member.id, currentTimeOnDuty]);
          const osszes = await db.get('SELECT SUM(time_on_duty) AS total_time FROM duty WHERE server_id = ? AND user_id = ?', [serverid, member.id]);
          interaction.reply({content:`Kiléptél a szolgálatból. Összesen ${convert(currentTimeOnDuty)}et voltál szolgálatban. Összesen: ${convert(osszes.total_time)}`,ephemeral: true});
          //delete dutyStatus[member.id];
          await updateDutyMessage(server.server_id);
        }else if(currentTimeOnDuty<=860 && 660<=currentTimeOnDuty){
          const naploSzoba = interaction.guild.channels.cache.get(dutylogszoba);
          if (naploSzoba) {
            // Küldjük el a naplózási üzenetet a meghatározott szobába
            naploSzoba.send(`GYANÚS -> <@${member.user.id}> ${convert(currentTimeOnDuty)} duty időt mentett!\n`);
          }
          const bekilog=interaction.guild.channels.cache.get(dutybekilogszoba);
          if (bekilog) {
            // Küldjük el a naplózási üzenetet a meghatározott szobába
            bekilog.send(`<@${member.user.id}> kilépett a szolgálatból!\n`);
          } else {
            //console.log('A naplózási szoba nem található vagy nem üzenhető!');
          }
          await db.run('INSERT INTO duty (server_id, user_id, time_on_duty) VALUES (?, ?, ?)', [serverid, member.id, currentTimeOnDuty]);
          await db.run('INSERT INTO osszes_duty (server_id, user_id, time_on_duty) VALUES (?, ?, ?)', [serverid, member.id, currentTimeOnDuty]);
          const osszes = await db.get('SELECT SUM(time_on_duty) AS total_time FROM duty WHERE server_id = ? AND user_id = ?', [serverid, member.id]);
          interaction.reply({content:`Kiléptél a szolgálatból. Összesen ${convert(currentTimeOnDuty)}et voltál szolgálatban. Összesen: ${convert(osszes.total_time)}`,ephemeral: true});
          //delete dutyStatus[member.id];
          await updateDutyMessage(server.server_id);
        }else {
          /*if(member.roles.cache.has(leader) && !member.roles.cache.has(elerhetoleader)){
            const leaderlog='1217196230883672105';
            const log=interaction.guild.channels.cache.get(leaderlog);
            log.send(`<@${member.user.id}> leaderi szolgálatba lépett!\n`);
        await member.roles.add(elerhetoleader);
      }*/

          const osszes = await db.get('SELECT SUM(time_on_duty) AS total_time FROM duty WHERE server_id = ? AND user_id = ?', [serverid, member.id]);
          interaction.reply({content:`Kiléptél a szolgálatból. Átlépted a mentési limitet, ezért a mentés nem történt meg. Összesen: ${convert(osszes.total_time)}`,ephemeral: true});
        }
      }
      }else {
        interaction.reply({content:`Nem vagy szolgálatban!\n`,ephemeral: true});
      }
  }else if(customId==='dutybe_button'){
    if (!member.roles.cache.has(regisztralt)) {
      interaction.reply({ content: 'Nem vagy regisztrálva, nyiss ticketet és egy leader regisztrál!', ephemeral: true });
      return;
  }
  if (member.roles.cache.has(szabadsag)) {
    interaction.reply({ content: 'Szabadságon vagy, kérlek használd a /munka parancsot!', ephemeral: true });
    return;
}
    if(member.roles.cache.has(szolgalati)){
      interaction.reply({content:'Szolgálatban vagy!\n',ephemeral: true});
      return;
    }else {
      const now = Date.now();
          await member.roles.add(szolgalati);
          await db.run('INSERT INTO duty_logs (server_id, user_id, time_on_duty) VALUES (?, ?, ?)', [serverid, member.id, now]);
          await updateDutyMessage(serverid);
          const bekilog=interaction.guild.channels.cache.get(dutybekilogszoba);
          if (bekilog) {
            // Küldjük el a naplózási üzenetet a meghatározott szobába
            bekilog.send(`<@${member.user.id}> szolgálatba lépett!\n`);
          } else {
            //console.log('A naplózási szoba nem található vagy nem üzenhető!');
          }
          interaction.reply({ content: 'Szolgálatba léptél!', ephemeral: true });
    }
  }else if(customId==='adatbutton'){
    const totalDutyTime = await getTotalDutyTime(serverid, member.id);
    const roleDate = await getRoleDate(serverid, member.id);
    const daysOnRole = calculateDaysOnRole(roleDate);
    const total=await getTotalDutyTimeFaction(serverid, member.id);
    interaction.reply({content:`Összesen ${convert(totalDutyTime)} volt szolgálatban az utolsó ellenőrzés óta.\nÖsszesen ${convert(total)} volt szolgálatban amióta a frakcióban van.\nEnnyi ideje van a rangon: ${daysOnRole} nap.`,ephemeral: true});
  }else if(customId==='megsebutton'){
    if (member.roles.cache.has(szolgalati)) {
      await db.get('DELETE FROM duty_logs WHERE user_id = ? AND server_id = ?', [member.id, serverid]);
      await member.roles.remove(szolgalati);
      await updateDutyMessage(serverid);
      const bekilog=interaction.guild.channels.cache.get(dutybekilogszoba);
          if (bekilog) {
            // Küldjük el a naplózási üzenetet a meghatározott szobába
            bekilog.send(`<@${member.user.id}> kilépett a szolgálatból, de nem mentette el az időt!\n`);
          } else {
            //console.log('A naplózási szoba nem található vagy nem üzenhető!');
          }
      interaction.reply({content:'Sikeresen eltávolítva rólad a Szolgálati rang!',ephemeral: true});
    }else {
      interaction.reply({content:'Nem vagy szolgálatban.',ephemeral: true});
    }
  }
}
});
const interval=60 * 60 * 1000;
setInterval(async () => {
  // Ellenőrizd a szabadságokat és a figyelmeztetéseket
  try {
    const guildsIDs = await db.all('SELECT server_id FROM servers');
    for (const serverid of guildsIDs) {
      const myguild= await getGuild(serverid.server_id);
      await checkszab(myguild);
      await checkwarn(myguild);
    }
      console.log('A szabadságok és figyelmeztetések ellenőrzése sikeres volt!');
  } catch (error) {
      console.error('Hiba történt a szabadságok és figyelmeztetések ellenőrzése közben:', error);
  }
}, interval); // Az időzítő 1 óránként fut le (60 perc * 60 másodperc * 1000 milliszekundum)
async function synSzolgalat(){
  try {
    const rows = await db.all('SELECT * FROM servers');
    for (const server of rows) {
      await szolgalatbanRoom(server.server_id, server);
    }
  } catch (error) {
    console.error('Error fetching servers from database:', error);
  }
}
setInterval(async () => {
  await synSzolgalat();
}, 180000); // 3 perc = 180000 milliszekundum
client.login(token);