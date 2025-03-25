import User from "../models/User.js";

// Helper to parse height from "5'10\"" to inches (or null if "None")
const parseHeight = (heightStr) => {
  if (!heightStr || heightStr === "None") return null;
  const [feet, inches] = heightStr.replace('"', "").split("'");
  return parseInt(feet) * 12 + (parseInt(inches) || 0);
};

// Helper to split hobbies string into an array
const splitHobbies = (hobbiesStr) => {
  if (!hobbiesStr || typeof hobbiesStr !== "string") return [];
  return hobbiesStr.split(",").map((hobby) => hobby.trim());
};

// Main matching function
export const getMatches = async (loggedInUserId) => {
  console.log("Fetching matches for user ID:", loggedInUserId);

  // Fetch the logged-in user's full profile
  const loggedInUser = await User.findById(loggedInUserId);
  if (!loggedInUser) {
    throw new Error("Logged-in user not found");
  }
  console.log("Logged-in user:", {
    gender: loggedInUser.gender,
    interestedIn: loggedInUser.interestedIn,
    height: loggedInUser.height,
    profileCompleted: loggedInUser.profileCompleted,
  });

  // Fetch all other completed profiles
  const profiles = await User.find({
    profileCompleted: true,
    _id: { $ne: loggedInUserId },
  }).select(
    "firstName photos bio courseStudy hobbies gender interestedIn birthday year quotes height hometown campusInvolvement dealBreakers pets drinking smoking electives"
  );
  console.log(
    "Fetched profiles:",
    profiles.map((p) => ({
      _id: p._id,
      gender: p.gender,
      interestedIn: p.interestedIn,
      height: p.height,
      profileCompleted: p.profileCompleted,
    }))
  );

  // Filter and score profiles
  const matchedProfiles = profiles
    .map((profile) => {
      console.log(`Processing profile: ${profile._id} (${profile.firstName})`);

      // Strict Filters
      const genderMatch =
        (loggedInUser.interestedIn === "Men" && profile.gender === "Men") ||
        (loggedInUser.interestedIn === "Women" && profile.gender === "Women");
      console.log("Gender match:", genderMatch, {
        userInterestedIn: loggedInUser.interestedIn,
        profileGender: profile.gender,
      });

      let heightMatch = true;
      if (loggedInUser.gender === "Women" && profile.gender === "Men") {
        const userHeight = parseHeight(loggedInUser.height);
        const profileHeight = parseHeight(profile.height);
        heightMatch =
          userHeight === null ||
          profileHeight === null ||
          profileHeight > userHeight;
        console.log("Height match:", heightMatch, {
          userHeight,
          profileHeight,
        });
      }

      if (!genderMatch && !heightMatch) {
        console.log("Profile excluded by strict filters");
        return null;
      }

      // Scoring
      let score = 0;

      // Birthday: +3 if within ±2 months
      const userBirthday = new Date(
        `${loggedInUser.birthday.year}-${loggedInUser.birthday.month}-${loggedInUser.birthday.day}`
      );
      const profileBirthday = new Date(
        `${profile.birthday.year}-${profile.birthday.month}-${profile.birthday.day}`
      );
      const monthDiff = Math.abs(
        (userBirthday.getFullYear() - profileBirthday.getFullYear()) * 12 +
          userBirthday.getMonth() -
          profileBirthday.getMonth()
      );
      if (monthDiff <= 2) score += 3;

      // Hometown: +3 if exact match
      if (loggedInUser.hometown === profile.hometown) score += 3;

      // Year: +2.5 if same, +2 if off by 1, +1 if off by 2 or 3
      const yearNum = { "1st": 1, "2nd": 2, "3rd": 3, "4th": 4 };
      const userYear = yearNum[loggedInUser.year] || 0;
      const profileYear = yearNum[profile.year] || 0;
      const yearDiff = Math.abs(userYear - profileYear);
      if (yearDiff === 0) score += 2.5;
      else if (yearDiff === 1) score += 2;
      else if (yearDiff <= 3) score += 1;

      // DealBreakers: -2 per mismatch
      const userDealBreakers =
        loggedInUser.dealBreakers?.split(",").map((d) => d.trim()) || [];
      if (userDealBreakers.includes("smoking") && profile.smoking === "Yes")
        score -= 2;
      if (userDealBreakers.includes("drinking") && profile.drinking === "Yes")
        score -= 2;

      // Hobbies: +1 per shared hobby
      const userHobbies = splitHobbies(loggedInUser.hobbies);
      const profileHobbies = splitHobbies(profile.hobbies);
      userHobbies.forEach((hobby) => {
        if (profileHobbies.includes(hobby)) score += 1;
      });

      // Electives: +2 per shared elective (3rd/4th years only)
      if (["3rd", "4th"].includes(loggedInUser.year)) {
        const userElectives = [
          loggedInUser.electives?.elective1,
          loggedInUser.electives?.elective2,
          loggedInUser.electives?.elective3,
        ].filter(Boolean);
        const profileElectives = [
          profile.electives?.elective1,
          profile.electives?.elective2,
          profile.electives?.elective3,
        ].filter(Boolean);
        userElectives.forEach((elective) => {
          if (profileElectives.includes(elective)) score += 2;
        });
      }

      // FavoriteSpot: +1 if same
      if (loggedInUser.favoriteSpot === profile.favoriteSpot) score += 1;

      // CourseStudy: +1 if same
      if (loggedInUser.courseStudy === profile.courseStudy) score += 1;

      // Pets: +1 if same
      if (loggedInUser.pets === profile.pets) score += 1;

      // Drinking: +1 if same, -1 if different
      if (loggedInUser.drinking === profile.drinking) score += 1;
      else if (loggedInUser.drinking && profile.drinking) score -= 1;

      // Smoking: +1 if same, -1 if different
      if (loggedInUser.smoking === profile.smoking) score += 1;
      else if (loggedInUser.smoking && profile.smoking) score -= 1;

      // Fest Flirt: +3 if same campusInvolvement
      if (loggedInUser.campusInvolvement === profile.campusInvolvement)
        score += 3;

      console.log("Score:", score);

      // Include if score > 0 OR if it passes strict filters (genderMatch && heightMatch)
      if (score <= 0 && !(genderMatch && heightMatch)) {
        console.log("Profile excluded: score <= 0 and failed strict filters");
        return null;
      }

      // Format the profile
      return {
        _id: profile._id,
        name: profile.firstName,
        age: profile.age || "N/A",
        hometown: profile.hometown || "N/A",
        year: profile.year || "N/A",
        department: profile.courseStudy || "N/A",
        bio: profile.bio || "No bio provided",
        image:
          profile.photos && profile.photos.length > 0
            ? profile.photos[0]
            : "https://via.placeholder.com/200",
        photos: profile.photos || [],
        interests: profile.interestedIn ? [profile.interestedIn] : [],
        hobbies: profile.hobbies ? [profile.hobbies] : [],
        favoriteQuote: profile.quotes?.[0] || "N/A",
        additionalInfo: "N/A",
        height: profile.height || "N/A",
        quotes: profile.quotes || [],
        score, // For debugging
      };
    })
    .filter((profile) => profile !== null);

  console.log("Matched profiles:", matchedProfiles);

  // Shuffle the matches
  for (let i = matchedProfiles.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [matchedProfiles[i], matchedProfiles[j]] = [
      matchedProfiles[j],
      matchedProfiles[i],
    ];
  }

  console.log("Shuffled profiles:", matchedProfiles);
  return matchedProfiles;
};
