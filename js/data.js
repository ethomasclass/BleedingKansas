/*
 * Where Is Reese Brown? Game content.
 *
 * Every word students read lives in this file. It mirrors the script doc
 * ("Where Is Reese Brown? Game Script"). Edit the doc first, then copy the
 * change here.
 *
 * Line format: [speaker, expression, text]
 *   speaker: a character id, "you" for the investigator, or "narrator".
 *   expression: one of the character's two expressions, or "" to keep the last one.
 *
 * Rule: no em dashes anywhere in student text.
 */
(function () {
  "use strict";

  // ---------- Notebook entries ----------
  const clues = {
    c1: { title: "Clue 1", text: "Brown went to Easton to guard the free-state vote on January 17, 1856." },
    c2: { title: "Clue 2", text: "Armed proslavery men attacked the Easton poll on January 17. A proslavery man named Cook was shot and died. Brown left for home on the morning of January 18." },
    c3: { title: "Clue 3", text: "The Kickapoo Rangers, a proslavery militia, rode after Brown on January 18." },
    c4: { title: "Clue 4", text: "The Rangers held Brown's group in Pike's back room. They let the others go but kept Brown." },
    c5: { title: "Clue 5", text: "Brown has sent no letters since January. Officials never answered Mrs. Brown's letters." },
    c6: { title: "Clue 6", text: "Grayson saw the Rangers put Brown in a wagon on the night of January 18. The wagon came back without him." },
    c7: { title: "Clue 7", text: "Brown never crossed the ferry, so he did not leave the area. On the night of January 18, a Rangers' wagon came toward the ferry, then turned back." },
    c8: { title: "Clue 8", text: "Two newspapers tell opposite stories about Brown. The \"ran away\" story comes from the proslavery paper." },
    c9: { title: "Clue 9", text: "Brown never picked up the rifles he ordered." },
    tA: { title: "Theory A", text: "Brown shot Cook and ran away. (Pruitt and the proslavery paper)" },
    tB: { title: "Theory B", text: "Brown went East to buy guns. (Cobb)" },
  };

  const history = {
    twogov: { title: "Two governments", text: "The territorial legislature and the free-state government each say the other is illegal." },
    topeka: { title: "The Topeka Constitution", text: "Free-state settlers refused the \"Bogus Legislature\" and set up their own government." },
    exclusion: { title: "Free state, not equal rights", text: "Free-state voters also voted to ban free Black people from Kansas. \"Free state\" did not mean equal rights." },
    fraud: { title: "Voter fraud", text: "In Kansas's first election in 1854, the House committee counted 1,729 illegal votes and only 1,114 legal ones." },
    c1850: { title: "Compromise of 1850", text: "Five laws meant to settle slavery in the new western lands." },
    debate: { title: "Historians disagree", text: "Did the Compromise of 1850 delay the war, or push the country closer to it?" },
    whigs: { title: "The Whigs", text: "The Whig Party broke apart over slavery." },
    ksne: { title: "Kansas-Nebraska Act (1854)", text: "Erased the Missouri Compromise line and let local voters decide about slavery. This is popular sovereignty." },
    pierce: { title: "President Pierce", text: "In January 1856, President Pierce sided with the proslavery territorial government." },
    fsa: { title: "Fugitive Slave Act (1850)", text: "No jury, no right to speak, $10 to send a person south and $5 to free them, and citizens had to help." },
    burns: { title: "Anthony Burns (1854)", text: "His case turned many Northerners against the Fugitive Slave Act. Northern states passed personal liberty laws to resist it." },
    novote: { title: "No vote either way", text: "Free Black settlers had no vote under either government." },
    knownothing: { title: "Know-Nothings", text: "The Know-Nothings (American Party) grew on fear of immigrants and Catholics." },
    bleeding: { title: "Bleeding Kansas", text: "The sack of Lawrence (May 21, 1856), the caning of Sumner (May 22), and the Pottawatomie killings (May 24 to 25). The caning split the country by region." },
    counting: { title: "Who did the counting?", text: "Almost every number in Kansas comes from someone with a side." },
    republicans: { title: "Republican Party", text: "Formed in 1854 to stop slavery from spreading west." },
    beecher: { title: "Beecher's Bibles", text: "Rifles sent to free-state settlers. Both sides were arming, which helped turn Kansas violent." },
    utc: { title: "Uncle Tom's Cabin (1852)", text: "Turned many Northerners against slavery." },
    pll: { title: "Personal liberty laws", text: "Northern state laws that resisted the federal Fugitive Slave Act." },
  };

  const who = {
    mrsbrown: "Local voters, but only people who really live here.",
    whitcomb: "Local voters, but only real settlers.",
    pruitt: "Proslavery Missourians, through the territorial legislature. His reason: a free Kansas would make it easier for enslaved people to escape.",
    pike: "Congress, by compromise.",
    tuttle: "Local voters, through popular sovereignty.",
    grayson: "Nobody. Freedom should never be up for a vote.",
    byrne: "Everyone the decision affects should get a say.",
    bell: "Whoever counts the votes.",
    cobb: "Whoever has the most guns.",
    hale: "A moral law, not a vote.",
    chair: "No vote at all: enslaved people, Native nations, free Black settlers, and women.",
  };

  // ---------- Characters ----------
  // place: which building they stand at. expr: two portrait expressions.
  const characters = {
    mrsbrown: {
      name: "Mrs. Brown", role: "Reese Brown's wife", place: "cabin", expr: ["worried", "determined"],
      greeting: [
        ["mrsbrown", "worried", "You're from the committee? Then you're the first person from any government who has knocked on my door."],
        ["mrsbrown", "determined", "My husband is Reese Brown. He went to Easton in January to guard the free-state vote. He never came home."],
      ],
      topics: [
        {
          id: "why", label: "Why did he go to Easton?",
          lines: [
            ["mrsbrown", "determined", "Kansas has two governments now. One is the territorial legislature. Free-state people call it the Bogus Legislature, because men from Missouri voted it in."],
            ["mrsbrown", "", "The other is the free-state government. It held its own election on January 15. Reese is a free-state leader, and people here trust him."],
            ["mrsbrown", "worried", "In Easton, men threatened to break up the vote, so it got moved to January 17. Reese went to make sure people could vote safely."],
          ],
          add: [["clue", "c1"], ["history", "twogov"]],
        },
        {
          id: "heard", label: "What have people told you?",
          lines: [
            ["mrsbrown", "worried", "Everyone tells me something different. Some say there was a fight at the polls. Some say Reese ran away."],
            ["mrsbrown", "determined", "Reese doesn't run. Talk to Amos Whitcomb at the polling place. He ran the vote."],
          ],
          add: [],
        },
        {
          id: "decide", label: "Who should decide about slavery in Kansas?", decide: true,
          lines: [
            ["mrsbrown", "determined", "The people who actually live here. That's all Reese wanted. A fair vote by people who live in Kansas."],
            ["mrsbrown", "", "Not men who ride in from Missouri for one day. And not a president a thousand miles away."],
            ["mrsbrown", "worried", "Of course, I can't vote at all. No woman in Kansas can. So \"the people\" is a smaller group than they make it sound."],
          ],
          add: [["who", "mrsbrown"]],
        },
      ],
      closing: [["mrsbrown", "determined", "Please find him. Or find out what happened. I need to know either way."]],
    },

    whitcomb: {
      name: "Amos Whitcomb", role: "Election judge", place: "polling", expr: ["nervous", "panicked"],
      greeting: [
        ["whitcomb", "panicked", "Who's there? Oh. You're not carrying a rifle. Good. Very good."],
        ["whitcomb", "nervous", "Sorry. Ever since January I jump at everything. Doors. Birds. My own sneezes."],
      ],
      topics: [
        {
          id: "night", label: "The night of the vote", requires: ["c1"],
          lines: [
            ["whitcomb", "nervous", "We opened the polls on January 17. By evening, a crowd of armed proslavery men showed up. They said our election was against the law."],
            ["whitcomb", "", "They grabbed two of our voters, Stephen Sparks and his son, and wouldn't let them go."],
            ["whitcomb", "nervous", "Reese Brown led some men to get them back. There was shouting. Then there was shooting."],
            ["whitcomb", "panicked", "A proslavery man named Cook was shot. He died. After that, everyone knew there would be trouble."],
            ["whitcomb", "nervous", "Reese and his men started home to Leavenworth the next morning. That was the last time I saw him."],
          ],
          add: [["clue", "c2"]],
        },
        {
          id: "two", label: "Why does Kansas have two elections?",
          lines: [
            ["whitcomb", "nervous", "In 1855, Kansas elected a legislature. But thousands of the voters lived in Missouri. They rode over, voted, and rode home."],
            ["whitcomb", "", "So we said that legislature was a fake. We met in Topeka, wrote our own constitution, and banned slavery in it."],
            ["whitcomb", "nervous", "The territorial government says our election breaks the law. We say theirs does. Two governments, two sets of laws, and nobody agrees which ones count."],
          ],
          add: [["history", "topeka"]],
        },
        {
          id: "voters", label: "Who was allowed to vote in your election?",
          lines: [
            ["whitcomb", "nervous", "White men who live in Kansas. That's who."],
            ["whitcomb", "", "And, well. We also voted on whether to keep free Black people out of Kansas completely. That passed."],
            ["whitcomb", "panicked", "Don't look at me like that! Lots of free-state men don't want slavery here. That doesn't mean they want Black neighbors."],
          ],
          add: [["history", "exclusion"]],
        },
        {
          id: "decide", label: "Who should decide about slavery?", decide: true,
          lines: [
            ["whitcomb", "nervous", "The voters of Kansas. The real ones. That's what popular sovereignty was supposed to mean."],
            ["whitcomb", "", "It's just very hard to have a fair vote when the other side brings guns to it."],
          ],
          add: [["who", "whitcomb"]],
        },
      ],
    },

    pruitt: {
      name: "Silas Pruitt", role: "Tavern keeper", place: "tavern", expr: ["scowl", "smug"],
      greeting: [
        ["pruitt", "scowl", "We're closed."],
        ["you", "", "The sign says open."],
        ["pruitt", "scowl", "The sign doesn't know you're from Washington."],
        ["pruitt", "smug", "Fine. Wipe your boots. Not on the rug. That rug is from Missouri, like everything good."],
      ],
      topics: [
        {
          id: "elections", label: "The Kansas elections",
          lines: [
            ["pruitt", "smug", "Sure, I voted. Right here in Kansas."],
            ["you", "", "Where do you live?"],
            ["pruitt", "smug", "Missouri. But on election day, I'm the proudest Kansan you ever met."],
            ["pruitt", "", "Thousands of us rode over. Voted, ate lunch, rode home. Best day of the year."],
            ["you", "", "That's against the law."],
            ["pruitt", "scowl", "Says who? We won, didn't we?"],
          ],
          add: [["history", "fraud"]],
        },
        {
          id: "cook", label: "Cook and Reese Brown", requires: ["c2"],
          lines: [
            ["pruitt", "scowl", "Cook was a good man. He went to Easton to stop an illegal election, and he got shot for it."],
            ["pruitt", "", "Everybody knows Brown's men shot him. Some say Brown pulled the trigger himself."],
            ["pruitt", "smug", "Next morning, the Kickapoo Rangers rode out after Brown. To bring him to justice."],
            ["you", "", "Whose justice?"],
            ["pruitt", "scowl", "The territorial government's. The legal one."],
            ["pruitt", "", "And if you want to know where Brown is now, here's my guess. He killed a man and ran away. That's what guilty men do."],
          ],
          add: [["clue", "c3"], ["clue", "tA"]],
        },
        {
          id: "decide", label: "Who should decide about slavery?", decide: true,
          lines: [
            ["pruitt", "smug", "The legislature. We elected it fair and square."],
            ["you", "", "You live in Missouri."],
            ["pruitt", "scowl", "Missouri is right next door. If Kansas goes free, our slaves will run across the line. So yes, we get a say."],
          ],
          add: [["who", "pruitt"]],
        },
      ],
    },

    pike: {
      name: "Ogden Pike", role: "Storekeeper", place: "store", expr: ["proud", "teary"],
      greeting: [
        ["pike", "proud", "Welcome, welcome! Say hello to Mr. Clay."],
        ["you", "", "That's a painting."],
        ["pike", "proud", "That is Henry Clay, the Great Compromiser! He's been dead four years and he's still the smartest man in this store."],
      ],
      topics: [
        {
          id: "c1850", label: "The Compromise of 1850",
          lines: [
            ["pike", "proud", "After the war with Mexico, the country was ready to split over slavery in the new land. So Mr. Clay wrote a plan. Five parts!"],
            ["pike", "", "One. California joins the Union as a free state."],
            ["pike", "", "Two. New Mexico and Utah decide about slavery for themselves."],
            ["pike", "", "Three. Texas gives up some land it claimed, and the government pays off Texas's debts."],
            ["pike", "", "Four. No more slave market in Washington, D.C. Slavery stays legal there. Just not the buying and selling."],
            ["pike", "", "Five. A tough new Fugitive Slave Act, to keep the South happy."],
            ["pike", "teary", "Mr. Clay put it all in one bill, and Congress voted it down. Then young Stephen Douglas passed the parts one at a time. Mr. Clay was so proud. Then he died."],
          ],
          add: [["history", "c1850"]],
        },
        {
          id: "work", label: "Did the Compromise work?",
          lines: [
            ["pike", "proud", "It kept the peace! For four whole years!"],
            ["pike", "teary", "Some people say it bought the country time. Others say it made things worse, because the Fugitive Slave Act made the North furious."],
            ["pike", "proud", "Mr. Clay, what do you think? ... He agrees with me. He always agrees with me."],
          ],
          add: [["history", "debate"]],
        },
        {
          id: "whigs", label: "What happened to the Whigs?",
          lines: [
            ["pike", "teary", "My party. Mr. Clay's party. After the Kansas-Nebraska Act, Northern Whigs and Southern Whigs couldn't stand each other, and the party fell apart."],
            ["pike", "", "The Northern ones are joining that new Republican Party. The Southern ones, who knows."],
            ["pike", "proud", "I still vote Whig. I'm the only one left. Me and Mr. Clay."],
          ],
          add: [["history", "whigs"]],
        },
        {
          id: "prisoners", label: "The prisoners", requires: ["c3"],
          lines: [
            ["pike", "teary", "I didn't want any of this. On January 18, the Kickapoo Rangers came back to Easton with Brown and his men as prisoners. They used my back room. My back room!"],
            ["pike", "", "They held some kind of fake trial in there. Lots of yelling. Lots of drinking. I hid behind the flour barrels."],
            ["pike", "", "After a while they let the other prisoners go. But they kept Brown. Then they told me to go home and mind my own business. So I did."],
            ["pike", "teary", "That's all I know. Ask whoever was up late that night."],
          ],
          add: [["clue", "c4"]],
        },
        {
          id: "decide", label: "Who should decide about slavery?", decide: true,
          lines: [
            ["pike", "proud", "Congress! The way Mr. Clay did it. Everybody gives a little, everybody gets a little."],
            ["pike", "teary", "Of course, the people being bought and sold never got anything. Mr. Clay never figured that part out."],
          ],
          add: [["who", "pike"]],
        },
      ],
    },

    tuttle: {
      name: "Lavinia Tuttle", role: "Postmaster", place: "post", expr: ["sly", "shocked"],
      greeting: [
        ["tuttle", "sly", "You must be the committee investigator. You got a letter from your mother. She says you don't write enough."],
        ["you", "", "You read my mail?"],
        ["tuttle", "shocked", "I would never read the mail! I hold it up to the lamp. That's different."],
      ],
      topics: [
        {
          id: "ksne", label: "The Kansas-Nebraska Act",
          lines: [
            ["tuttle", "sly", "Senator Stephen Douglas wrote it in 1854. Smart man. Short man, but smart."],
            ["tuttle", "", "The old Missouri Compromise line said no slavery up here. Douglas erased it. Now the people who live in Kansas and Nebraska vote on slavery themselves."],
            ["tuttle", "", "That's called popular sovereignty. \"Popular\" means the people. \"Sovereignty\" means power. The people have the power!"],
            ["tuttle", "shocked", "Well. Some of the people. Not me. Women can't vote. I just know everything, which is better."],
          ],
          add: [["history", "ksne"]],
        },
        {
          id: "washington", label: "What does Washington say?",
          lines: [
            ["tuttle", "sly", "I read the president's message to Congress. In the newspaper! Not in anybody's mail."],
            ["tuttle", "", "In January, President Pierce called the free-state government \"revolutionary.\" He said if it fought back with force, that would be treason."],
            ["tuttle", "", "So Washington backs the territorial government. The one the Missouri men voted in."],
          ],
          add: [["history", "pierce"]],
        },
        {
          id: "letters", label: "Any letters from Reese Brown?", requiresAny: ["tA", "tB"],
          lines: [
            ["tuttle", "sly", "Not one. And believe me, I would know."],
            ["tuttle", "", "If Reese Brown were alive and hiding somewhere, he would write to his wife. Every man writes to his wife. Even the bad ones. Especially the bad ones."],
            ["tuttle", "shocked", "And here's the part that makes me mad. Mrs. Brown has written to the territorial governor three times. No answer. Not even \"we got your letter.\""],
          ],
          add: [["clue", "c5"]],
        },
        {
          id: "decide", label: "Who should decide about slavery?", decide: true,
          lines: [
            ["tuttle", "sly", "The voters, of course! Let the people decide!"],
            ["you", "", "Even if the voters live in Missouri?"],
            ["tuttle", "shocked", "Well, no. Not those voters. The real ones. The right ones. It's harder than Senator Douglas made it sound."],
          ],
          add: [["who", "tuttle"]],
        },
      ],
    },

    grayson: {
      name: "Thomas Grayson", role: "Blacksmith", place: "forge", expr: ["wry", "serious"],
      greeting: [
        ["grayson", "wry", "Somebody from Washington, asking questions, in my shop. You lost?"],
        ["you", "", "I'm trying to find out what happened to Reese Brown."],
        ["grayson", "wry", "I bet everybody in town has talked your ear off about Reese Brown. Funny thing. Nobody has asked me."],
      ],
      topics: [
        {
          id: "boston", label: "Why did you leave Boston?",
          lines: [
            ["grayson", "serious", "I was born free in Massachusetts. I ran a forge in Boston for twelve years."],
            ["grayson", "", "Then came the Fugitive Slave Act in 1850. Under that law, a slave catcher could point at a Black man and say, \"He escaped from me.\""],
            ["grayson", "serious", "The accused man got no jury. He wasn't even allowed to speak for himself. The official who heard the case got ten dollars for sending him south, and only five for setting him free."],
            ["grayson", "", "And every citizen had to help catch him. Even people who hated slavery."],
          ],
          add: [["history", "fsa"]],
        },
        {
          id: "burns", label: "Anthony Burns",
          lines: [
            ["grayson", "serious", "In 1854, they arrested a man named Anthony Burns in Boston. He had escaped slavery in Virginia."],
            ["grayson", "", "Thousands of people filled the streets. The government sent soldiers and a cannon to march one man to a ship."],
            ["grayson", "wry", "People in Boston who never thought about slavery suddenly thought about it a lot. Massachusetts passed a law to block the Fugitive Slave Act. A personal liberty law, they call it. A state fighting a federal law."],
            ["grayson", "serious", "I watched him walk to that ship. That summer, I headed west."],
          ],
          add: [["history", "burns"]],
        },
        {
          id: "better", label: "Is Kansas any better?",
          lines: [
            ["grayson", "wry", "Let me tell you about my two governments."],
            ["grayson", "", "The territorial government wants Kansas to be a slave state. That is a danger to me every single day."],
            ["grayson", "", "The free-state government? Its voters said yes to banning Black people like me from living in Kansas at all."],
            ["grayson", "serious", "Both sides held elections about my life. Neither one let me vote."],
          ],
          add: [["history", "novote"]],
        },
        {
          id: "night", label: "The night of January 18", requires: ["c4"],
          lines: [
            ["grayson", "serious", "I was working late. I do my best work when the town is asleep."],
            ["grayson", "", "Around midnight, I saw men lead Reese Brown out of Pike's store. They put him in the back of a wagon. Kickapoo Rangers rode beside it."],
            ["grayson", "", "The wagon went down the road toward the ferry. It came back before sunrise. Brown wasn't in it."],
            ["you", "", "Why didn't you tell anyone?"],
            ["grayson", "wry", "Tell who? The territorial officials around here are friends with the Rangers. The free-state government has no courts. And nobody from either one has knocked on my door. Until you."],
          ],
          add: [["clue", "c6"]],
        },
        {
          id: "decide", label: "Who should decide about slavery?", decide: true,
          lines: [
            ["grayson", "serious", "You keep asking who should decide whether people are free."],
            ["grayson", "wry", "Here's a better question. Why is that a vote at all? Nobody held a vote on whether you get to be free."],
          ],
          add: [["who", "grayson"]],
        },
      ],
    },

    byrne: {
      name: "Declan Byrne", role: "Ferryman", place: "ferry", expr: ["grin", "offended"],
      greeting: [
        ["byrne", "grin", "Welcome to the finest ferry on the creek! Ten cents a ride. Mind the goat."],
        ["you", "", "Why do you have a goat?"],
        ["byrne", "grin", "That's Senator. He eats newspapers. Only the Know-Nothing ones. He has excellent taste."],
        ["senator", "", "Mehhh."],
      ],
      topics: [
        {
          id: "kn", label: "Who are the Know-Nothings?",
          lines: [
            ["byrne", "offended", "A political party back East. They call themselves the American Party. They hate immigrants, especially Irish ones, especially Catholic ones. I'm both. Two for one."],
            ["byrne", "", "They started as a secret club. If you asked a member about it, he'd say, \"I know nothing.\" So that's what everybody calls them."],
            ["byrne", "offended", "They say people like me steal their jobs and take orders from the Pope. I take orders from Senator. He's very demanding."],
          ],
          add: [["history", "knownothing"]],
        },
        {
          id: "why", label: "Why did you come to Kansas?",
          lines: [
            ["byrne", "", "I came over from Ireland during the famine. Boston didn't want me. New York didn't want me."],
            ["byrne", "grin", "Kansas doesn't care who I am. Kansas only cares if I'm free-state or proslavery. I tell everyone I'm pro-ferry. It's good for business."],
          ],
          add: [],
        },
        {
          id: "ferry", label: "Did Reese Brown cross your ferry?", requiresAny: ["tA", "tB"],
          lines: [
            ["byrne", "offended", "Reese Brown? No. Anyone leaving this part of the country with a horse or a wagon crosses here. Brown never did."],
            ["byrne", "grin", "I'd remember. He owes me ten cents from Christmas. A man doesn't forget a debt like that."],
            ["byrne", "", "But here's something odd. The night of January 18, some Rangers came down the road with a wagon. They saw my lantern, turned around, and went back the way they came. Too dark to see what was in the back."],
          ],
          add: [["clue", "c7"]],
        },
        {
          id: "decide", label: "Who should decide about slavery?", decide: true,
          lines: [
            ["byrne", "", "Back East, the Know-Nothings say men like me shouldn't decide anything."],
            ["byrne", "grin", "So here's my rule. Whoever decides, they have to ask everybody. Even the Irish. Even the goat."],
            ["byrne", "offended", "Fine. Maybe not the goat."],
            ["senator", "", "Mehhh."],
          ],
          add: [["who", "byrne"]],
        },
      ],
    },

    bell: {
      name: "Horace Bell", role: "Newspaper editor", place: "print", expr: ["shouting", "scheming"],
      greeting: [
        ["bell", "shouting", "EXTRA! EXTRA! COMMITTEE INVESTIGATOR WALKS INTO PRINT SHOP!"],
        ["you", "", "You don't have to shout."],
        ["bell", "shouting", "I ALWAYS HAVE TO SHOUT. I'M A NEWSPAPER."],
      ],
      topics: [
        {
          id: "news", label: "What's the news?",
          lines: [
            ["bell", "shouting", "WHERE HAVE YOU BEEN? Kansas is bleeding!"],
            ["bell", "", "May 21. A proslavery posse rode into Lawrence, the big free-state town. They burned the hotel, wrecked two newspaper presses, and looted the stores."],
            ["bell", "", "May 22. In Washington, Senator Charles Sumner of Massachusetts had just given a fiery speech about Kansas. He insulted a senator from South Carolina. So that senator's relative, Congressman Preston Brooks, walked up to Sumner's desk and beat him with a cane. Sumner was badly hurt."],
            ["bell", "scheming", "Southerners mailed Brooks new canes as presents. Northerners were furious. North and South can't even agree about a beating."],
            ["bell", "", "May 24. A man named John Brown and his followers attacked proslavery settlers along Pottawatomie Creek. Five men were killed."],
            ["you", "", "John Brown? Is he related to Reese Brown?"],
            ["bell", "scheming", "No relation. Lots of Browns in Kansas. It's very hard on headline writers."],
            ["bell", "shouting", "BLEEDING KANSAS! That's what the papers call it now. I wish I'd thought of it."],
          ],
          add: [["history", "bleeding"]],
        },
        {
          id: "brown", label: "Reese Brown",
          lines: [
            ["bell", "scheming", "Read these. Two newspapers, same week, same man."],
            ["papers", "", ""],
            ["you", "", "Which one is true?"],
            ["bell", "scheming", "Depends who you ask. Every paper in Kansas picks a side. So does every number. Even your committee's numbers."],
            ["bell", "", "Your committee has three members. Two are from the new antislavery party. One is a Democrat from Missouri. Guess which ones say the elections were a fraud?"],
          ],
          add: [["clue", "c8"], ["clue", "tA"], ["history", "counting"]],
        },
        {
          id: "republicans", label: "The new Republican Party",
          lines: [
            ["bell", "shouting", "NEW PARTY FORMED! Well, two years ago. Right after the Kansas-Nebraska Act. The Republicans want to stop slavery from spreading into the West."],
            ["bell", "scheming", "Northern Whigs are joining. Some Know-Nothings too. Some Democrats. The old parties are cracking like ice on the creek."],
          ],
          add: [["history", "republicans"]],
        },
        {
          id: "decide", label: "Who should decide about slavery?", decide: true,
          lines: [
            ["bell", "scheming", "Whoever controls the vote count, my friend. That's who really decides."],
            ["bell", "shouting", "HEADLINE: MAN SAYS SOMETHING TRUE! NOBODY BELIEVES HIM!"],
          ],
          add: [["who", "bell"]],
        },
      ],
    },

    cobb: {
      name: "Ezra Cobb", role: "Bible salesman (bonus)", place: "wagon", expr: ["wink", "nervous"], bonus: true,
      greeting: [
        ["cobb", "wink", "Bibles! Fine Bibles from New England! Get your Bibles!"],
        ["you", "", "Can I see one?"],
        ["cobb", "nervous", "No. They're very holy. Too holy to open."],
        ["you", "", "That crate is shaped like a rifle."],
        ["cobb", "wink", "It's a long Bible."],
      ],
      topics: [
        {
          id: "heavy", label: "Why are the Bibles so heavy?",
          lines: [
            ["cobb", "wink", "Antislavery groups back East raise money to send settlers to Kansas. Some send plows. Some send Sharps rifles."],
            ["cobb", "", "A famous preacher, Henry Ward Beecher, said a rifle could do more good in Kansas than a Bible. So people started calling the rifles \"Beecher's Bibles.\" Some crates even got shipped marked as books."],
            ["cobb", "nervous", "The proslavery side has guns too, of course. Everybody in Kansas is buying. Business is great. Kansas is not."],
          ],
          add: [["history", "beecher"]],
        },
        {
          id: "brown", label: "Did you know Reese Brown?",
          lines: [
            ["cobb", "wink", "Brown? He ordered six of my Bibles. Said he'd pick them up in January."],
            ["cobb", "nervous", "He never came. I figure he went back East to find a better price. Cheapskate."],
            ["you", "", "Or something happened to him."],
            ["cobb", "nervous", "...Huh. I hadn't thought of that."],
          ],
          add: [["clue", "tB"], ["clue", "c9"]],
        },
        {
          id: "decide", label: "Who should decide about slavery?", decide: true,
          lines: [["cobb", "wink", "In Kansas? Whoever has the most Bibles."]],
          add: [["who", "cobb"]],
        },
      ],
    },

    hale: {
      name: "Prudence Hale", role: "Schoolteacher (bonus)", place: "school", expr: ["cheerful", "stern"], bonus: true,
      greeting: [
        ["hale", "cheerful", "Oh good, a new student! Sit down. Have you read Uncle Tom's Cabin?"],
        ["you", "", "I'm not a student. I'm from the committee."],
        ["hale", "stern", "That's not what I asked."],
      ],
      topics: [
        {
          id: "utc", label: "Uncle Tom's Cabin",
          lines: [
            ["hale", "cheerful", "Harriet Beecher Stowe wrote it in 1852. It tells the story of enslaved people and how cruel slavery is."],
            ["hale", "cheerful", "It sold 300,000 copies in its first year! People in the North who had never seen slavery cried over it. Then they got angry."],
            ["hale", "stern", "The South hated it and called it lies. I say read it and decide for yourself. Then write me a five-paragraph essay."],
            ["hale", "cheerful", "Fun fact. Her brother is Henry Ward Beecher. The one with the rifles. Busy family."],
          ],
          add: [["history", "utc"]],
        },
        {
          id: "pll", label: "Personal liberty laws",
          lines: [
            ["hale", "cheerful", "After Anthony Burns was sent back, Massachusetts passed a personal liberty law. It made the Fugitive Slave Act much harder to enforce there."],
            ["hale", "stern", "A state standing up to the federal government! Southern states say states must obey federal law. Funny how that changes depending on the law."],
          ],
          add: [["history", "pll"]],
        },
        {
          id: "decide", label: "Who should decide about slavery?", decide: true,
          lines: [["hale", "stern", "Some things shouldn't be decided by a vote at all. You can't vote something wrong into being right."]],
          add: [["who", "hale"]],
        },
      ],
    },
  };

  // Byrne's goat speaks but has no topics of his own.
  const extras = {
    senator: { name: "Senator", role: "A goat", expr: ["chewing", "bleating"] },
  };

  // Bell's two front pages (made-up papers).
  const papers = [
    { name: "The Liberty Lantern", side: "Free-state paper", headline: "FREE-STATE HERO SEIZED!", deck: "Reese Brown captured by Rangers after defending the ballot box." },
    { name: "The Border Bugle", side: "Proslavery paper", headline: "KILLER ON THE RUN!", deck: "Reese Brown shot a lawful citizen at an illegal election, then fled." },
  ];

  // ---------- The empty chair ----------
  const chair = {
    label: "The empty chair",
    cards: [
      "This chair is for the people whose lives this vote was about.",
      "In 1855, Kansas counted 192 enslaved people living in the territory. Both elections were about whether people like them could be owned. None of them could vote in either one. No one asked them anything.",
      "This land was home to Native nations, including the Delaware and the Kickapoo. Treaties pushed them off most of it just before settlers arrived. They had no vote in either election. The Kickapoo Rangers took their name from a town named after the Kickapoo people.",
      "Free Black settlers like Thomas Grayson could not vote under either government. Neither could any woman, including Mrs. Brown. So who was left to decide?",
    ],
  };

  // ---------- Intro panels ----------
  const intro = [
    { year: "1820", title: "A line on the map", art: "map1820",
      text: "In 1820, Congress drew a line across the western lands. South of the line, new states could allow slavery. North of it, slavery was banned. This deal was called the Missouri Compromise. Congress decided." },
    { year: "1848", title: "New land, old fight", art: "intro-2",
      text: "In 1848, the United States won a war with Mexico and took a huge amount of land. Would slavery be allowed there? The old line did not answer that. The country started fighting about slavery all over again." },
    { year: "1850", title: "Five laws to keep the peace", art: "intro-3",
      text: "Congress tried again. Senator Henry Clay put five laws into one big bill, and it failed. Then Senator Stephen Douglas passed the laws one at a time. Together they were called the Compromise of 1850.",
      hint: "Want the details? Ogden Pike at the general store will tell you. And tell you. And tell you." },
    { year: "1850 to 1854", title: "A law that reached the North", art: "intro-4",
      text: "One of the five laws was the Fugitive Slave Act. It said people who escaped slavery had to be sent back, even from free states. The accused got no jury, and Northerners had to help catch them. In 1854, Boston watched soldiers march a man named Anthony Burns back to slavery.",
      hint: "Thomas Grayson, the blacksmith, was in Boston that day." },
    { year: "1854", title: "Let the voters decide", art: "map1854",
      text: "In 1854, Congress passed the Kansas-Nebraska Act. It erased the 1820 line. Now the people living in Kansas would vote on slavery for themselves. This idea was called popular sovereignty.",
      hint: "Lavinia Tuttle at the post office loves this idea. She loves gossip even more." },
    { year: "1854 and 1855", title: "Who counts as a voter?", art: "intro-6",
      text: "On election days in 1854 and 1855, thousands of armed men rode in from Missouri. They voted in Kansas, then went home. A proslavery legislature took power.",
      hint: "Silas Pruitt at the tavern might tell you about it. If he lets you in." },
    { year: "1855", title: "Two governments", art: "intro-7",
      text: "Free-state settlers called it the \"Bogus Legislature\" and refused to obey it. They wrote their own constitution in Topeka and planned their own election. Now Kansas had two governments, and each one said the other was illegal.",
      hint: "Amos Whitcomb ran the free-state vote here in Easton." },
    { year: "January 1856", title: "Gone", art: "intro-8",
      text: "The free-state election was set for January 15, 1856. Here in Easton, threats pushed the vote back to January 17. Reese P. Brown, a free-state leader from Leavenworth, came to guard the polls. No one has seen him since January 18." },
    { year: "June 1856", title: "You arrive", art: "intro-9",
      text: "Congress has sent a committee to find out what is going wrong in Kansas. You work for that committee. Your job is to find out what happened to Reese Brown. As you go, keep one question in mind: when people can't agree about slavery, who should decide?",
      hint: "Start with Mrs. Brown." },
  ];

  // ---------- Next-lead hints shown in the corner of the town ----------
  function nextLead(has) {
    if (!has("c1")) return "Talk to Mrs. Brown at her cabin.";
    if (!has("c2")) return "Find Amos Whitcomb at the polling place.";
    if (!has("c3")) return "Ask Silas Pruitt at the tavern about Cook.";
    if (!has("c4")) return "Ask Ogden Pike at the general store about the prisoners.";
    if (!has("c6")) return "Someone was up late that night. Try the forge.";
    if (!has("c7") && !has("c5")) return "Test the other theories. Did Brown ever leave town?";
    return "You can solve the case now. Or keep talking to people.";
  }

  // ---------- Solving the case ----------
  const solve = {
    q1: {
      title: "What happened to Reese Brown?",
      prompt: "Pick the theory the evidence supports best.",
      choices: [
        { id: "A", text: "He shot Cook and ran away.", correct: false, hint: "Look again. Byrne says Brown never crossed the ferry. Tuttle says he never wrote home." },
        { id: "B", text: "He went East to buy guns.", correct: false, hint: "Look again. Brown never picked up his rifles, and he never crossed the ferry." },
        { id: "C", text: "The Kickapoo Rangers took him.", correct: true, hint: "Correct." },
      ],
      cluePrompt: "Now pick two clues that prove it.",
      goodClues: ["c3", "c4", "c6", "c7"],
    },
    q2: {
      title: "Why did the Rangers take him?",
      prompt: "Pick one, then choose a clue that backs it up.",
      choices: [
        { id: "revenge", text: "Revenge for Cook" },
        { id: "election", text: "The election" },
        { id: "both", text: "Both" },
      ],
      note: "Pruitt says the Rangers wanted \"justice\" for Cook. Whitcomb says armed men came to stop the vote before anyone was shot.",
    },
    q3: {
      title: "Why has no one been arrested?",
      prompt: "Check every reason the evidence supports.",
      reasons: [
        { id: "friends", text: "The territorial officials here are friends with the Rangers.", ok: true, src: "Grayson" },
        { id: "courts", text: "The free-state government has no courts anyone has to obey.", ok: true, src: "Grayson, Whitcomb" },
        { id: "washington", text: "Washington backs the territorial government.", ok: true, src: "Tuttle" },
        { id: "letters", text: "Officials never answered Mrs. Brown's letters.", ok: true, src: "Tuttle" },
        { id: "witness", text: "Nobody asked the one person who saw the wagon.", ok: true, src: "Grayson" },
        { id: "guilty", text: "Brown is guilty and hiding.", ok: false, src: "Look again: Byrne and Tuttle." },
      ],
      mostPrompt: "Who is most responsible?",
      most: [
        { id: "rangers", text: "The Rangers" },
        { id: "officials", text: "The officials who won't act" },
        { id: "system", text: "A system with two governments and no shared law" },
      ],
    },
    final: {
      title: "Who should have decided about slavery in Kansas?",
      choices: ["Congress", "Local voters", "Nobody: freedom isn't up for a vote", "Other"],
      frame: ["Although", "should have decided because", "and because"],
      exit: "Should the people who live in a place get to decide whether others there are free?",
    },
  };

  const reality = {
    title: "What really happened",
    paragraphs: [
      "Reese P. Brown was a real person. So were the January 1856 election at Easton, the fight at the polls, the death of a proslavery man named Cook, and the Kickapoo Rangers.",
      "In real life, Brown did not disappear. The Rangers held him prisoner at Easton and attacked him with a hatchet. They carried him home in a wagon, and he died of his wounds.",
      "No one was ever punished for his death.",
      "A few days later, President Pierce called the free-state government \"revolutionary.\"",
      "The townspeople in this game are made up. Their opinions are based on real views people held in 1856.",
    ],
    next: "The fighting in Kansas went on for years. Kansas finally joined the Union as a free state in January 1861. A few months later, the Civil War began.",
  };

  window.GAME_DATA = { clues, history, who, characters, extras, papers, chair, intro, nextLead, solve, reality };
})();
