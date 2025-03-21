import { AutoTokenizer } from "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.4.0";

let userSelections = [];
const questions = [
  {
    question: "Are you a?",
    options: ["Beach", "Mountain"],
    type: "trait",
  },
  {
    question: "Do you prefer?",
    options: ["Sunrise", "Sunset"],
    type: "pref",
  },
  {
    question: "Are you more of a?",
    options: ["City", "Countryside"],
    type: "trait",
  },
  {
    question: "Weekend plan?",
    options: ["College", "Chilling"],
    type: "pref",
  },
  {
    question: "You prefer?",
    options: ["Binge-watching", "Gaming"],
    type: "pref",
  },
  {
    question: "Your cravings?",
    options: ["Fast", "Home-cooked"],
    type: "pref",
  },
  {
    question: "Are you an?",
    options: ["Introvert", "Extrovert"],
    type: "trait",
  },
  {
    question: "First message?",
    options: ["Funny", "Deep"],
    type: "pref",
  },
  {
    question: "Do you prefer?",
    options: ["Random", "Well-planned"],
    type: "pref",
  },
  {
    question: "Do you prefer?",
    options: ["Texting", "Calling"],
    type: "pref",
  },
  {
    question: "Ideal first date?",
    options: ["Coffee", "Home"],
    type: "pref",
  },
  {
    question: "Are you a?",
    options: ["Morning", "Night"],
    type: "trait",
  },
  {
    question: "Are you a?",
    options: ["Foody", "Non-foody"],
    type: "trait",
  },
  { question: "Are you?", options: ["Picky", "Easy"], type: "trait" },
  { question: "Do you prefer?", options: ["Music", "No"], type: "pref" },
];
let currentQuestionIndex = 0;

async function loadModel() {
  try {
    const model = await tf.loadGraphModel("/gpt2-medium-tfjs/model.json");
    console.log("GPT-2 Medium model loaded successfully!");
    return model;
  } catch (error) {
    console.error("Error loading model:", error);
  }
}

async function loadTokenizer() {
  try {
    console.log("Starting to load tokenizer...");
    const tokenizer = await AutoTokenizer.from_pretrained("gpt2-medium");
    console.log("Tokenizer loaded successfully!");
    console.log(
      "Tokenizer methods:",
      Object.getOwnPropertyNames(Object.getPrototypeOf(tokenizer))
    );
    const testTokens = await tokenizer.tokenize("beach");
    console.log("Tokenizer test - beach tokens:", testTokens);
    return tokenizer;
  } catch (error) {
    console.error("Error loading tokenizer:", error);
  }
}

async function generateText(model, tokenizer, prompt, selections) {
  let inputTensor = null;
  let attentionTensor = null;
  try {
    console.log("Starting text generation with prompt:", prompt);

    let inputIds = await tokenizer.encode(prompt);
    inputIds = inputIds
      .filter((id) => Number.isFinite(id))
      .map((id) => Number(id));
    const attentionMask = Array(inputIds.length).fill(1);
    console.log("Input IDs:", inputIds);
    console.log("Decoded prompt check:", tokenizer.decode(inputIds));

    inputTensor = tf.tensor2d([inputIds], [1, inputIds.length], "int32");
    attentionTensor = tf.tensor2d(
      [attentionMask],
      [1, attentionMask.length],
      "int32"
    );

    let generatedIds = [...inputIds];
    let generatedAttention = [...attentionMask];
    const eosToken = tokenizer.eos_token_id || 50256;
    const maxTokensPerSentence = 15; // More room for traits
    const numSentences = 3;
    let sentences = [];
    const usedSeedIds = new Set();

    const seedTokens = {};
    for (let selection of selections) {
      if (!selection || selection === "empty") continue;
      const tokenIds = await tokenizer.encode(selection.toLowerCase());
      console.log(`Encoded ${selection}:`, tokenIds);
      const validToken = tokenIds[0];
      seedTokens[selection] = validToken;
    }
    const seedKeys = Object.keys(seedTokens);
    console.log("Seed Tokens:", seedTokens);

    if (seedKeys.length < 3) {
      throw new Error("Not enough valid seed tokens for 3 sentences!");
    }

    const shuffledSeeds = [...seedKeys].sort(() => Math.random() - 0.5);
    const selectedSeeds = shuffledSeeds.slice(0, 3);
    console.log("Selected Seeds for Sentences:", selectedSeeds);

    const seedIds = Object.values(seedTokens);

    for (let s = 0; s < numSentences; s++) {
      let seedWord = selectedSeeds[s];
      let currentSeedId = seedTokens[seedWord];
      let sentenceIds = [currentSeedId];
      usedSeedIds.add(currentSeedId);
      generatedIds = [...inputIds, ...sentenceIds];
      generatedAttention = [...attentionMask, 1];

      if (inputTensor) inputTensor.dispose();
      if (attentionTensor) attentionTensor.dispose();
      inputTensor = tf.tensor2d(
        [generatedIds],
        [1, generatedIds.length],
        "int32"
      );
      attentionTensor = tf.tensor2d(
        [generatedAttention],
        [1, generatedAttention.length],
        "int32"
      );

      for (
        let i = 0;
        i < maxTokensPerSentence - 1 &&
        generatedIds[generatedIds.length - 1] !== eosToken;
        i++
      ) {
        const inputs = {
          input_ids: inputTensor,
          attention_mask: attentionTensor,
        };
        const output = model.execute(inputs);

        const logitsTensor = output[2];
        const lastTokenLogits = logitsTensor.slice(
          [0, logitsTensor.shape[1] - 1, 0],
          [1, 1, 50257]
        );

        const k = 15;
        const temperature = 0.9;
        const scaledLogits = lastTokenLogits.div(temperature);
        const topK = scaledLogits.squeeze().topk(k);
        const topIndices = topK.indices.dataSync();

        let nextToken;
        if (Math.random() < 0.4 && sentenceIds.length < 3) {
          // Upped seed bias
          let nextTokenCandidates = topIndices.filter(
            (id) => seedIds.includes(id) && !usedSeedIds.has(id)
          );
          nextToken =
            nextTokenCandidates.length > 0
              ? nextTokenCandidates[
                  Math.floor(Math.random() * nextTokenCandidates.length)
                ]
              : topIndices[Math.floor(Math.random() * k)];
        } else {
          nextToken = topIndices[Math.floor(Math.random() * k)];
        }
        nextToken =
          Number.isFinite(nextToken) &&
          nextToken > 200 &&
          nextToken !== eosToken
            ? Number(nextToken)
            : topIndices[0];
        console.log(`Sentence ${s}, Iteration ${i}: Next Token:`, nextToken);

        sentenceIds.push(nextToken);
        if (seedIds.includes(nextToken)) usedSeedIds.add(nextToken);
        generatedIds.push(nextToken);
        generatedAttention.push(1);

        if (inputTensor) inputTensor.dispose();
        if (attentionTensor) attentionTensor.dispose();
        inputTensor = tf.tensor2d(
          [generatedIds],
          [1, generatedIds.length],
          "int32"
        );
        attentionTensor = tf.tensor2d(
          [generatedAttention],
          [1, generatedAttention.length],
          "int32"
        );

        if (
          i === maxTokensPerSentence - 2 &&
          ![13, 25, 0].includes(nextToken)
        ) {
          sentenceIds.push(13);
          generatedIds.push(13);
          generatedAttention.push(1);
          break;
        }

        output.forEach((tensor) => tensor.dispose());
      }

      console.log(`Sentence ${s} IDs before decode:`, sentenceIds);
      let decodeIds = sentenceIds.filter(
        (id) => Number.isFinite(id) && id !== eosToken
      );
      if (decodeIds.length === 0) {
        sentences.push("Wild energy short-circuited!");
        console.log(`Sentence ${s} rejected: No valid IDs`);
        continue;
      }
      let sentence = await tokenizer.decode(decodeIds);
      sentence = sentence.trim();

      const commaCount = (sentence.match(/,/g) || []).length;
      const wordCount = sentence.split(" ").length;
      if (commaCount > 2 || !sentence.includes(" ") || wordCount < 4) {
        console.log(
          `Sentence ${s} rejected - Reason: Commas: ${commaCount}, Words: ${wordCount}, Text:`,
          sentence
        );
        sentences.push(`Wild ${seedWord} energy flows!`);
        generatedIds = [...inputIds]; // Reset to prompt
        generatedAttention = [...attentionMask];
      } else {
        if (!sentence.endsWith(".") && !sentence.endsWith("!")) sentence += "!";
        sentences.push(sentence);
        generatedIds = [...inputIds, ...sentenceIds]; // Carry forward
        generatedAttention = [
          ...attentionMask,
          ...Array(sentenceIds.length).fill(1),
        ];
      }
    }

    const generatedText = sentences.join("\n");
    console.log("Generated Text:", generatedText);
    return generatedText;
  } catch (error) {
    console.error("Error generating text:", error);
    throw error;
  } finally {
    if (inputTensor) inputTensor.dispose();
    if (attentionTensor) attentionTensor.dispose();
    tf.disposeVariables();
  }
}

let gpt2Model;
let gpt2Tokenizer;

async function initialize() {
  try {
    console.log("Initializing model and tokenizer...");
    await new Promise((resolve) => setTimeout(resolve, 100));
    gpt2Model = await loadModel();
    gpt2Tokenizer = await loadTokenizer();
  } catch (error) {
    console.error("Initialization error:", error);
  }
}
initialize();

function updateQuestion() {
  const currentQuestion = questions[currentQuestionIndex];
  document.getElementById("question-text").textContent =
    currentQuestion.question;
  document.getElementById("option1-text").textContent =
    currentQuestion.options[0];
  document.getElementById("option2-text").textContent =
    currentQuestion.options[1];
}

function handleColumnClick(column, isLeft) {
  const slideClass = isLeft ? "slide-left" : "slide-right";
  try {
    const selectedOption = isLeft
      ? document.getElementById("option1-text").textContent
      : document.getElementById("option2-text").textContent;

    userSelections[currentQuestionIndex] = selectedOption;

    column.classList.add(slideClass);
    setTimeout(() => {
      column.classList.remove(slideClass);
      if (currentQuestionIndex < questions.length - 1) {
        currentQuestionIndex++;
        updateQuestion();
      } else {
        document.querySelector(".skip-button").style.display = "none";
        document.querySelector(".match-button").style.display = "inline-block";
        console.log("Final User Selections:", userSelections);
      }
    }, 500);
  } catch (error) {
    console.error("Column click error:", error);
  }
}

document
  .getElementById("option1-column")
  .addEventListener("click", function () {
    handleColumnClick(this, true);
  });

document
  .getElementById("option2-column")
  .addEventListener("click", function () {
    handleColumnClick(this, false);
  });

document.querySelector(".skip-button").addEventListener("click", function () {
  try {
    userSelections[currentQuestionIndex] = "empty";
    if (currentQuestionIndex < questions.length - 1) {
      currentQuestionIndex++;
      updateQuestion();
    } else {
      document.querySelector(".skip-button").style.display = "none";
      document.querySelector(".match-button").style.display = "inline-block";
      console.log("Final User Selections:", userSelections);
    }
  } catch (error) {
    console.error("Skip button error:", error);
  }
});

document
  .querySelector(".match-button")
  .addEventListener("click", async function () {
    try {
      console.log("Let's Match button clicked! Redirecting to explore.html...");
      window.location.href = "explore.html";
    } catch (error) {
      console.error("Match button error:", error);
    }
  });
