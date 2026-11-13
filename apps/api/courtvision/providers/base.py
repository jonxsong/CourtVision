from abc import ABC, abstractmethod

from courtvision.schemas import GameDetail, GamePage, PlayerPage, PlayerProfile, ShotDataset


class BasketballDataProvider(ABC):
    slug: str
    is_demo: bool

    @abstractmethod
    async def players(self, query: str | None, page: int, page_size: int) -> PlayerPage: ...

    @abstractmethod
    async def player(self, player_id: str, season: str) -> PlayerProfile | None: ...

    @abstractmethod
    async def games(self, page: int, page_size: int) -> GamePage: ...

    @abstractmethod
    async def game(self, game_id: str) -> GameDetail | None: ...

    @abstractmethod
    async def shots(self, player_id: str | None, season: str) -> ShotDataset: ...
