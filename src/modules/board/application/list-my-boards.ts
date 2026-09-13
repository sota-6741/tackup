import type { Board } from "@/modules/board/domain/board";
import type { BoardRepository } from "@/modules/board/domain/board-repository";

type Deps = {
  boardRepository: BoardRepository;
};

export function makeListMyBoards({ boardRepository }: Deps) {
  return async function listMyBoards(userId: string): Promise<Board[]> {
    return boardRepository.findAllByUserId(userId);
  };
}
