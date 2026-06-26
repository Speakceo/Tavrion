"""LangGraph RAG agent for Tavrion Bot.

Uses https://github.com/langchain-ai/langgraph for stateful retrieve-then-answer flow.
"""

from __future__ import annotations

import math
from typing import Annotated, TypedDict

from langchain_core.messages import AIMessage, BaseMessage, HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langgraph.graph import END, StateGraph
from langgraph.graph.message import add_messages


class BotState(TypedDict):
    messages: Annotated[list[BaseMessage], add_messages]
    bot_id: str
    bot_name: str
    source_url: str
    question: str
    context: str
    chunks: list[dict]
    answer: str


def cosine_similarity(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a))
    nb = math.sqrt(sum(y * y for y in b))
    return dot / (na * nb) if na and nb else 0.0


def retrieve_chunks(
    chunks: list[dict],
    query_embedding: list[float],
    top_k: int = 6,
) -> list[dict]:
    scored = []
    for chunk in chunks:
        emb = chunk.get("embedding")
        if not emb or not isinstance(emb, list):
            continue
        scored.append({**chunk, "score": cosine_similarity(query_embedding, emb)})
    scored.sort(key=lambda x: x["score"], reverse=True)
    return scored[:top_k]


def build_rag_graph(openai_key: str):
    embeddings = OpenAIEmbeddings(model="text-embedding-3-small", api_key=openai_key)
    llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.3, api_key=openai_key)

    def retrieve_node(state: BotState) -> dict:
        query_vec = embeddings.embed_query(state["question"])
        top = retrieve_chunks(state["chunks"], query_vec)
        if top:
            context = "\n\n".join(
                f"[{i+1}] {c.get('metadata', {}).get('title', 'Page')} "
                f"({c.get('metadata', {}).get('url', '')}):\n{c['content']}"
                for i, c in enumerate(top)
            )
        else:
            context = "No relevant content found in the knowledge base."
        return {"context": context}

    def generate_node(state: BotState) -> dict:
        system = SystemMessage(content=f"""You are {state['bot_name']}, an AI assistant for {state['source_url']}.
Answer questions ONLY using the website content below. Be helpful, concise, and friendly.
If the answer is not in the context, say you don't have that information and suggest visiting {state['source_url']}.
Never invent facts. Reference page titles when useful.

WEBSITE CONTENT:
{state['context']}""")

        history = [m for m in state["messages"] if isinstance(m, (HumanMessage, AIMessage))]
        response = llm.invoke([system, *history[-6:], HumanMessage(content=state["question"])])
        answer = response.content if isinstance(response.content, str) else str(response.content)
        return {
            "answer": answer,
            "messages": [HumanMessage(content=state["question"]), AIMessage(content=answer)],
        }

    graph = StateGraph(BotState)
    graph.add_node("retrieve", retrieve_node)
    graph.add_node("generate", generate_node)
    graph.set_entry_point("retrieve")
    graph.add_edge("retrieve", "generate")
    graph.add_edge("generate", END)

    return graph.compile()


async def run_rag_chat(
    openai_key: str,
    bot: dict,
    chunks: list[dict],
    question: str,
    history: list[dict] | None = None,
) -> str:
    graph = build_rag_graph(openai_key)

    messages: list[BaseMessage] = []
    for item in history or []:
        if item.get("role") == "user":
            messages.append(HumanMessage(content=item["content"]))
        elif item.get("role") == "assistant":
            messages.append(AIMessage(content=item["content"]))

    result = graph.invoke({
        "messages": messages,
        "bot_id": bot["id"],
        "bot_name": bot.get("bot_name") or bot.get("name", "Assistant"),
        "source_url": bot["source_url"],
        "question": question,
        "context": "",
        "chunks": chunks,
        "answer": "",
    })

    return result["answer"]
